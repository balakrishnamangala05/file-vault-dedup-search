from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="storedfile",
            name="mime_type",
            field=models.CharField(default="application/octet-stream", max_length=120),
        ),
    ]
