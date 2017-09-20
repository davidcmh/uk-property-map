from django.conf.urls import url
from main import views

urlpatterns = [
    url(r'^$', views.HomeView.as_view()),
    url(r'^transaction-summary$', views.transaction_summary),
    url(r'^transaction-list$', views.transaction_list),
    url(r'^increment-like-count$', views.increment_like_count),
    url(r'^decrement-like-count$', views.decrement_like_count),
    url(r'^get-like-count$', views.get_like_count)
]