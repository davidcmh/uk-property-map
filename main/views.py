from django.shortcuts import render
from django.views.generic import TemplateView
from django.http import HttpResponse
import sqlite3
from os import environ
import json
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie


class HomeView(TemplateView):
    @method_decorator(ensure_csrf_cookie)
    def get(self, request, **kwargs):
        return render(request, 'main/index.html', context=None)


def dict_factory(cursor, row):
    """Helper function to convert each row of data from database into dict"""
    d = {}
    for index, col in enumerate(cursor.description):
        d[col[0]] = row[index]
    return d


def run_sql(query, db=environ['SQLITE_DB']):
    """Helper function to execute SQL query"""
    conn = sqlite3.connect(db)
    conn.row_factory = dict_factory
    result = conn.execute(query).fetchall()
    conn.commit()
    conn.close()
    return result


def transaction_summary(request):
    map_bounds = json.loads(request.body)
    query = """
        SELECT p.Longitude longitude, p.Latitude latitude, COUNT(t.transaction_id) as transaction_count,
            GROUP_CONCAT(DISTINCT t.postcode) distinct_postcodes
        FROM postcodes as p 
        JOIN transactions as t on t.postcode = p.`Postcode 3`
        WHERE p.Longitude > {min_lon} AND p.Longitude < {max_lon}
            AND p.Latitude > {min_lat} AND p.Latitude < {max_lat}
        GROUP BY p.Longitude, p.Latitude;
    """.format(min_lon=map_bounds['longitude']['min'],
               max_lon=map_bounds['longitude']['max'],
               min_lat=map_bounds['latitude']['min'],
               max_lat=map_bounds['latitude']['max'],
               )
    result = run_sql(query)
    return HttpResponse(json.dumps(result))


def transaction_list(request):
    input = json.loads(request.body)
    query = """
        SELECT estate_type, property_type, transaction_category, price_paid, transaction_date, postcode, property_address  
        FROM transactions
        WHERE postcode IN ({postcodes});
    """.format(postcodes=','.join(['"{}"'.format(p.strip())
                                   for p in input['postcodes'].split(',')]))
    result = run_sql(query)
    return HttpResponse(json.dumps(result))

