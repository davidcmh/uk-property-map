from django.conf.urls import url
from main import views

urlpatterns = [
    url(r'^$', views.HomeView.as_view()),
    url(r'^postcodes$', views.postcodes)
]