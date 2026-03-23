from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0008_sharelink"),
    ]

    operations = [
        migrations.AddField(
            model_name="fileupload",
            name="deleted_at",
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
    ]
