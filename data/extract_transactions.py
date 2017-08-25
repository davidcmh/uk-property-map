# get data using API

import requests
import csv
from io import StringIO
import time
import sqlite3
import math
import copy

form_data_template = {
    "output": "csv",
    "url": "http://lr-pres-dev-c.epimorphics.net/landregistry/query",
    "q": """
        prefix lrppi: <http://landregistry.data.gov.uk/def/ppi/>
        prefix lrcommon: <http://landregistry.data.gov.uk/def/common/>
        
        SELECT *  
        WHERE
        {{
          ?transaction_record a lrppi:TransactionRecord;
                            lrppi:propertyAddress ?property_address.
          ?property_address lrcommon:postcode ?postcode.
          VALUES ?postcode {{ {postcodes} }}
            
          OPTIONAL {{?transaction_record lrppi:hasTransaction ?has_transaction}}
          OPTIONAL {{?transaction_record lrppi:estateType ?estate_type}}
          OPTIONAL {{?transaction_record lrppi:propertyType ?property_type}}
          OPTIONAL {{?transaction_record lrppi:recordStatus ?record_status}}
          OPTIONAL {{?transaction_record lrppi:transactionCategory ?transaction_category}}
          OPTIONAL {{?transaction_record lrppi:pricePaid ?price_paid}}
          OPTIONAL {{?transaction_record lrppi:transactionDate ?transaction_date}}
          OPTIONAL {{?transaction_record lrppi:transactionId ?transaction_id}}
        }}
    """
}


def dict_factory(cursor, row):
    """Helper function to convert each row of data from database into dict"""
    d = {}
    for index, col in enumerate(cursor.description):
        d[col[0]] = row[index]
    return d


def execute_sql_query(query, execute_many=False, execute_many_input=None, db='db.sqlite3'):
    conn = sqlite3.connect(db)
    conn.row_factory = dict_factory
    cursor = conn.cursor()
    result = None

    stt = time.time()
    if execute_many:
        if not execute_many_input:
            raise Exception('execute_many_input parameter was not passed in.')
        result = cursor.executemany(query, execute_many_input)
    else:
        result = cursor.execute(query)
    conn.commit()

    if result is not None:
        result = result.fetchall()

    print('Executed SQL query in {} seconds'.format(time.time() - stt))
    return result


def get_distinct_postcode_count():
    distinct_postcode_count_sql = """
        select count(distinct(`Postcode 3`)) AS distinct_postcode_count
        from postcodes;
    """
    result = execute_sql_query(distinct_postcode_count_sql)
    distinct_postcode_count = result[0]['distinct_postcode_count']
    print('Distinct postcode count:', distinct_postcode_count)
    return distinct_postcode_count


def get_postcodes_batch(batch_num, batch_size):
    get_postcodes_sql = """
        select `Postcode 3` as postcode 
        from postcodes
        order by `Postcode 3`
        limit {}
        offset {};
    """

    query = get_postcodes_sql.format(batch_size, batch_num * batch_size)
    result = execute_sql_query(query)
    postcodes = [row['postcode'] for row in result]
    return postcodes


def extract_load_transaction_data(postcodes):
    print('Getting data from Land Registry API')
    form_data = copy.deepcopy(form_data_template)
    form_data['q'] = form_data['q'].format(
        postcodes=' '.join(['"{}"'.format(postcode) for postcode in postcodes])
    )
    print(form_data)
    r = requests.post("http://landregistry.data.gov.uk/app/root/qonsole/query",
                      data=form_data)
    if r.status_code != 200:
        raise Exception('Failed to execute transaction API.')

    result = r.json().get('result')
    if result is None:
        raise Exception('No result was returned from transaction API.')

    insert_transactions_sql = """
        INSERT INTO transactions
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """
    csvreader = csv.reader(StringIO(result), delimiter=',')
    input = [row for row in csvreader][1:]
    print('Extracted {} transaction records.'.format(len(input)))

    if len(input):
        execute_sql_query(insert_transactions_sql,
                          execute_many=True,
                          execute_many_input=input)
        print('Inserted {} rows into transactions table'.format(len(input)))
    else:
        print('Moving on to next batch as no transaction record was found for the current batch of postcodes.')

    return len(input)


if __name__ == '__main__':
    distinct_postcode_count = get_distinct_postcode_count()

    batch_size = 100
    for batch_num in range(math.ceil(distinct_postcode_count/ batch_size)):
        # adhoc code, remove later
        if batch_num < 11637:
            continue


        stt = time.time()
        print('Loading batch {}'.format(batch_num))
        postcodes = get_postcodes_batch(batch_num, batch_size)
        extract_load_transaction_data(postcodes)
        print('Loaded batch in {} seconds\n'.format(time.time() - stt))