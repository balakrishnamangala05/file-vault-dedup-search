from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0009_fileupload_deleted_at"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="FileComment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("body", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("upload", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="comments",
                    to="api.fileupload",
                )),
                ("user", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="comments",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"db_table": "api_filecomment", "ordering": ["created_at"]},
        ),
    ]
