from flask import session, request
from flask_socketio import emit

from .. import socketio, games
from indian_dices.game.game_engine import Game, parse_response


@socketio.on('connect', namespace='/play')
def on_connect():
    
    print(f"{session['username']} connected!")


@socketio.on('start game', namespace='/play')
def start_game() -> None:

    game = Game()
    games[request.sid] = game
    
    player = game.get_first_turn()
    emit('first turn', {'player': player})

    if player == 1: roll_bot_dices(request.sid)


@socketio.on('roll dice', namespace='/play')
def roll_dice(data) -> None:
    game = games[request.sid]
    
    onboard = data['onboard']
    rand, moves = game.get_user_moves(onboard)

    state = game.get_state()
    response = {'values': rand, 'moves': moves}
    
    emit('dices', {**response, 'state': state})


@socketio.on('user move', namespace='/play')
def end_move(data) -> None:
    
    game = games[request.sid]
    game.set_score(data['value'])
    
    all_moved = game.update_state()
    if all_moved == True:
        
        [response, over], winner = game.get_result(), None
        response = parse_response(response)
        
        if over == True:
            winner = game.get_winner()

        state = game.get_state()
        final = {'over': over, 'winner': winner}

        emit('end round', {**response, **final, 'state': state})

    else: roll_bot_dices(request.sid)


@socketio.on('next', namespace='/play')
def next() -> None:
    roll_bot_dices(request.sid)


def roll_bot_dices(request_sid: int) -> None:
    game = games[request_sid]

    rand = game.get_bot_dices()
    state = game.get_state()
        
    emit('dices', {'values': rand, 'state': state})


@socketio.on('bot turn', namespace='/play')
def nake_bot_move():

    game = games[request.sid]
    move, last = game.get_bot_move()
    
    state = game.get_state()
    
    all_moved, score = False, None
    if last == True:    
        
        score = game.get_value()
        all_moved = game.update_state()
        
    response = {'move': move, 'end': {'last': last, 'score': score}, 'allmoved': all_moved}
    emit('bot move', {**response, 'state': state})


@socketio.on('end round', namespace='/play')
def send_round_info() -> None:
    game, winner = games[request.sid], None

    response, over = game.get_result()
    response = parse_response(response)

    if over == True:
        winner = game.get_winner()

    state = game.get_state()
    final = {'over': over, 'winner': winner}

    emit('end round', {**response, **final, 'state': state})


@socketio.on('disconnect', namespace='/play')
def on_disconnect() -> None:
    
    del games[request.sid]
    print(f"{session['username']} disconnected!")