import re
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

COMMON_PASSWORDS = {
    "password", "12345678", "123456789", "password1", "qwerty123",
    "iloveyou", "admin123", "letmein1", "welcome1", "monkey123",
}

def validate_password(password):
    if len(password) < 8:
        return "Password must be at least 8 characters."
    if not re.search(r"[A-Z]", password):
        return "Password must contain at least one uppercase letter."
    if not re.search(r"[0-9]", password):
        return "Password must contain at least one number."
    if password.lower() in COMMON_PASSWORDS:
        return "Password is too common. Please choose a stronger password."
    return None


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username", "").strip()
        password = request.data.get("password", "")

        if not username or not password:
            return Response(
                {"error": "Username and password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(username) < 3:
            return Response(
                {"error": "Username must be at least 3 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not re.match(r"^[a-zA-Z0-9_.-]+$", username):
            return Response(
                {"error": "Username can only contain letters, numbers, _ . and -"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        password_error = validate_password(password)
        if password_error:
            return Response({"error": password_error}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response(
                {"error": "Username already taken"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(username=username, password=password)
        from .models import UserProfile
        UserProfile.objects.create(user=user)
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "username": user.username,
            },
            status=status.HTTP_201_CREATED,
        )
