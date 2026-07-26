from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ServerViewSet, BrowseView, ProxyView, SearchView, CacheView

router = DefaultRouter()
router.register(r'servers', ServerViewSet, basename='servers')

urlpatterns = [
    path('', include(router.urls)),
    path('browse/',  BrowseView.as_view(),  name='browse'),
    path('proxy/',   ProxyView.as_view(),   name='proxy'),
    path('search/',  SearchView.as_view(),  name='search'),
    path('cache/',   CacheView.as_view(),   name='cache'),
]
