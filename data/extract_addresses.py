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
        prefix lrcommon: <http://landregistry.data.gov.uk/def/common/>

        SELECT ?address ?paon ?saon ?street ?town ?county ?postcode
        WHERE
        {{
          VALUES ?address {{ {addresses} }}
          ?address lrcommon:postcode ?postcode.
          OPTIONAL {{?address lrcommon:county ?county}}
          OPTIONAL {{?address lrcommon:paon ?paon}}
          OPTIONAL {{?address lrcommon:saon ?saon}}
          OPTIONAL {{?address lrcommon:street ?street}}
          OPTIONAL {{?address lrcommon:town ?town}}
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


def get_transaction_count():
    transaction_count_sql = """
        select count(*) as transaction_count from transactions;
    """
    result = execute_sql_query(transaction_count_sql)
    transaction_count = result[0]['transaction_count']
    print('Transaction count:', transaction_count)
    return transaction_count


def get_address_batch(batch_num, batch_size):
    get_address_sql = """
        select property_address as address 
        from transactions
        order by property_address
        limit {}
        offset {};
    """

    query = get_address_sql.format(batch_size, batch_num * batch_size)
    result = execute_sql_query(query)
    addresses = [row['address'] for row in result]
    return addresses


def extract_load_address_data(addresses):
    print('Getting data from Land Registry API')
    form_data = copy.deepcopy(form_data_template)
    form_data['q'] = form_data['q'].format(
        addresses=' '.join(['<{}>'.format(address) for address in set(addresses)])
    )
    # print(form_data['q'])
    r = requests.post("http://landregistry.data.gov.uk/app/root/qonsole/query",
                      data=form_data)
    if r.status_code != 200:
        raise Exception('Failed to execute API.')

    result = r.json().get('result')
    if result is None:
        raise Exception('No result was returned from API.')

    insert_addresses_sql = """
        INSERT OR IGNORE INTO addresses
        VALUES (?, ?, ?, ?, ?, ?, ?);
    """
    csvreader = csv.reader(StringIO(result), delimiter=',')
    input = [row for row in csvreader][1:]
    print('Extracted {} address records.'.format(len(input)))

    if len(input):
        execute_sql_query(insert_addresses_sql,
                          execute_many=True,
                          execute_many_input=input)
        print('Inserted {} rows into addresses table'.format(len(input)))
    else:
        print('Moving on to next batch as no address record was found for the current batch of addresses.')

    return len(input)


if __name__ == '__main__':
    transaction_count = get_transaction_count()
    batch_size = 10000

    # note: API may fail for some addresses and crash the program. Need to manually skip and restart.
    for batch_num in range(math.ceil(transaction_count/ batch_size)):
        stt = time.time()
        print('Loading batch {}'.format(batch_num))
        addresses = get_address_batch(batch_num, batch_size)
        extract_load_address_data(addresses)
        print('Loaded batch in {} seconds\n'.format(time.time() - stt))