from django.shortcuts import render
from django.views.generic import TemplateView

# Create your views here.
class HomeView(TemplateView):
    def get(self, request, **kwargs):
        return render(request, 'main/index.html', context=None)
