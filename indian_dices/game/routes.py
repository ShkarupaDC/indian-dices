from flask import render_template, url_for, redirect, request, session
from .game_engine import Game
from . import game

@game.route('/', methods=['GET', 'POST'])
def init_game():
    if request.method == 'POST':
        session['username'] = request.form.get('username')

        if not session['username']:
            session['username'] = 'Anonymous'

        return redirect(url_for('game.play_game'))
    return render_template('init_game.html')

@game.route('/play')
def play_game():
    
    if 'username' not in session:
        return redirect(url_for('game.init_game')) 

    return render_template('game.html', combinations=Game.combinations,
            username=session['username'], sides=6, dices=5)