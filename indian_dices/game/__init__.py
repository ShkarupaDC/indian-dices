from flask import Blueprint

game = Blueprint('game', __name__, static_folder='static',
     static_url_path='/indian_dices/game/static/', template_folder='templates')

from . import events, routes