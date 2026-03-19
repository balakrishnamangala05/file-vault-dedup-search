from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0002_storedfile_mime_type"),
    ]

    operations = [
        migrations.CreateModel(
            name="Tag",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=50, unique=True)),
                ("color", models.CharField(default="#3b82f6", max_length=7)),
            ],
            options={
                "db_table": "api_tag",
                "ordering": ["name"],
            },
        ),
        migrations.AddField(
            model_name="fileupload",
            name="tags",
            field=models.ManyToManyField(blank=True, related_name="uploads", to="api.tag"),
        ),
    ]
