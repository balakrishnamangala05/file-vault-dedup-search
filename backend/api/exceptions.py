from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.http import Http404
from django.db import DatabaseError


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns JSON responses for all errors.
    """
    response = exception_handler(exc, context)

    if response is not None:
        # Customize the response data
        custom_response_data = {
            'error': True,
            'message': str(exc),
            'status_code': response.status_code
        }
        response.data = custom_response_data
    elif isinstance(exc, Http404):
        # Handle Django's Http404
        response = Response(
            {
                'error': True,
                'message': str(exc) or 'Not found',
                'status_code': 404
            },
            status=status.HTTP_404_NOT_FOUND
        )
    elif isinstance(exc, DatabaseError):
        # Handle database errors
        response = Response(
            {
                'error': True,
                'message': f'Database error: {str(exc)}',
                'status_code': 500
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response
