from __future__ import absolute_import, unicode_literals

# This will make sure the app is always imported when
# Django starts so that shared_task will use this app.
from .celeryapp import app as celery_app

__all__ = ['celery_app']

import pymysql

pymysql.install_as_MySQLdb()
pymysql.version_info = (1, 3, 13, "final", 0)