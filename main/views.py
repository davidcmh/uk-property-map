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


def run_sql(query):
    """Helper function to execute SQL query"""
    conn = sqlite3.connect(environ['SQLITE_DB'])
    conn.row_factory = dict_factory
    result = conn.execute(query).fetchall()
    conn.commit()
    conn.close()
    return result


def postcodes(request):
    map_bounds = json.loads(request.body)
    query = """
        SELECT distinct `Postcode 3` as postcode, Longitude as longitude, Latitude as latitude
        FROM postcodes
        WHERE Longitude > {min_lon} AND Longitude < {max_lon}
            AND Latitude > {min_lat} AND Latitude < {max_lat}
        ;
    """.format(min_lon=map_bounds['longitude']['min'],
               max_lon=map_bounds['longitude']['max'],
               min_lat=map_bounds['latitude']['min'],
               max_lat=map_bounds['latitude']['max'],
               )
    result = run_sql(query)
    return HttpResponse(json.dumps(result))
