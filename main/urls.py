from django.conf.urls import url
from main import views

urlpatterns = [
    url(r'^$', views.HomeView.as_view()),
    url(r'^transaction-summary$', views.transaction_summary),
    url(r'^transaction-list$', views.transaction_list)
]