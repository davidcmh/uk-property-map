from django.shortcuts import render
from django.views.generic import TemplateView
from django.http import HttpResponse
import json
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
import os
import MySQLdb
import MySQLdb.cursors
from django.conf import settings

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
    print(query)
    if os.getenv('SERVER_SOFTWARE', '').startswith('Google App Engine'):
        conn = MySQLdb.connect(unix_socket=settings.DATABASES['default']['HOST'],
                               port=3306,
                               user='root',
                               db='uk_property',
                               cursorclass=MySQLdb.cursors.DictCursor)
    else:
        conn = MySQLdb.connect(host=settings.DATABASES['default']['HOST'],
                               port=3306,
                               user='root',
                               db='uk_property',
                               cursorclass=MySQLdb.cursors.DictCursor)
    dict_cur = conn.cursor()
    dict_cur.execute(query)
    result = dict_cur.fetchall()
    conn.commit()
    conn.close()
    return result


def transaction_summary(request):
    map_bounds = json.loads(request.body)
    query = """
        SELECT p.longitude, p.latitude, COUNT(t.transaction_id) as transaction_count,
            GROUP_CONCAT(DISTINCT t.postcode) distinct_postcodes
        FROM postcodes as p
        JOIN transactions as t on t.postcode = p.postcode_3
        WHERE p.longitude > {min_lon} AND p.longitude < {max_lon}
            AND p.latitude > {min_lat} AND p.latitude < {max_lat}
        GROUP BY p.longitude, p.latitude;
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
        SELECT t.estate_type, t.property_type, t.transaction_category, t.price_paid, t.transaction_date, a.paon, a.saon,
               a.street, a.town, a.county, t.postcode
        FROM transactions t
        JOIN addresses a ON t.property_address = a.address
        WHERE t.postcode IN ({postcodes});
    """.format(postcodes=','.join(['"{}"'.format(p.strip())
                                   for p in input['postcodes'].split(',')]))
    result = run_sql(query)
    return HttpResponse(json.dumps(result))


def increment_like_count(request):
    query = """
        UPDATE app_variables SET `value`=`value`+1 WHERE `name`='like_count';
    """
    run_sql(query)

    return get_like_count()


def decrement_like_count(request):
    query = """
        UPDATE app_variables SET `value`=`value`-1 WHERE `name`='like_count';
    """
    run_sql(query)

    return get_like_count()


def get_like_count(request=None):
    query = """
        SELECT `value` from app_variables WHERE `name`='like_count';
    """
    result = run_sql(query)
    like_count = result[0]['value']

    return HttpResponse(like_count)