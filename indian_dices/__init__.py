from flask import Flask
from flask_socketio import SocketIO

socketio = SocketIO()
games = dict()

def create_app(debug=False):

    app = Flask(__name__)
    app.debug = debug
    app.config["SECRET_KEY"] = "2fd12f71138b82a1"

    from .game import game
    app.register_blueprint(game)

    socketio.init_app(app)
    return app