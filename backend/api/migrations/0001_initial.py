# Generated migration
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='StoredFile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sha256', models.CharField(db_index=True, max_length=64, unique=True)),
                ('size_bytes', models.BigIntegerField()),
                ('storage_path', models.TextField()),
                ('ref_count', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'api_storedfile',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='FileUpload',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('original_name', models.CharField(max_length=255)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('stored_file', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='uploads', to='api.storedfile')),
            ],
            options={
                'db_table': 'api_fileupload',
                'ordering': ['-uploaded_at'],
            },
        ),
    ]
