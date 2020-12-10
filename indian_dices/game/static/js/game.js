import { BOT, USER } from "./dice_manager.js";
import DiceManager from './dice_manager.js';

const socket = io('http://' + document.domain + ':' + location.port + '/play');
const rollButton = document.querySelector('#roll-button');

const diceManager = new DiceManager();
const [diceWrappers, moveToNode] = initElements();

let round = 1;
const userName = document.querySelector('tr[player-id="0"]'
    ).firstElementChild.innerHTML

socket.on('connect', () => {
    socket.emit('start game');
});

socket.on('first turn', async (data) => {

    printMessage(`${data.player ? 'Bot' : userName} Turn`);
    diceManager.sleep(500).then(() => hideMessage());

    if (data.player == USER) {
        
        rollButton.addEventListener('click', rollHandler);
        activateDiceClick();
    }
});

socket.on('dices', async (data) => {
    await diceManager.rollDices(data.values);

    if (data.state.player == USER) {
        activateUserMove(data.moves, data.state.round);

        if (!data.state.allowed) {
            rollButton.removeEventListener('click', rollHandler);
        }
    } else {
        socket.emit('bot turn');
    }
})

socket.on('bot move', async (data) => {
    
    await diceManager.moveDices(data.move);
    if (data.end.last) {

        await diceManager.moveAllToTable(BOT);
        setValueToTable(data.end.score, data.state.round, BOT);

        if (data.allmoved) {
            socket.emit('end round');
        }

        rollButton.addEventListener('click', rollHandler);
        activateDiceClick()
    
    } else { socket.emit('next'); }
})

socket.on('end round', data => {
    updateResults(data.status, data.result, data.state.round);
    round = data.state.round;

    if (data.over == true) {
        printMessage(data.winner == null ? 'Draw' : data.winner ? 'Bot Win' : `${userName} Win`);
        socket.disconnect();
    }

    if (data.state.player == BOT) {
        socket.emit('next');
    }
})

function diceHandler(event) {
    
    let target = event.target.closest('.dice-wrapper');
    diceManager.moveDice(target, USER);
}

function rollHandler() {
    
    deactivateUserMove();

    let onboard = diceManager.getValuesOnBoard();
    socket.emit('roll dice', {onboard: onboard})
}

async function activateHandler(event) {

    let node = event.target.closest('tr');
    let value = +node.lastElementChild.innerHTML;

    setValueToTable(value, round, USER);
    rollButton.removeEventListener('click', rollHandler);
    
    deactivateUserMove(); 
    deactivateDiceClick();

    await diceManager.moveAllToTable(USER);    
    socket.emit('user move', {value: value});
}

function initElements() {
    let diceWrappers = document.querySelectorAll('.dice-wrapper');

    let  moveToNode = new Map();
    let moveNodes = document.querySelectorAll('.move-name');
    
    for (let node of moveNodes) {
        moveToNode.set(node.innerHTML, node.parentElement);
    }
    return [diceWrappers, moveToNode];
}

function setValueToTable(value, round, player) {
    
    let selector = `tr[player-id='${player}']`;
    let node = document.querySelector(selector);
    
    node.children[round].innerHTML = value;
}

function activateDiceClick() {
    diceWrappers.forEach(value => value.addEventListener(
        'click', diceHandler));
}

function deactivateDiceClick() {
    diceWrappers.forEach(value => value.removeEventListener(
        'click', diceHandler));
}

function deactivateUserMove() {
    let active_moves = document.querySelectorAll('.move');

    for (let node of active_moves) {

        node.parentElement.removeEventListener('click', activateHandler);
        node.classList.remove('active', 'move');
    }
}

function activateUserMove(combinations, round) {
    for (let name of combinations) {
        
        let node = moveToNode.get(name);
        node.lastElementChild.classList.add('active', 'move');

        node.addEventListener('click', activateHandler);
    }
}

function updateResults(status, result, round) {
    let nodes = document.querySelectorAll('tr[player-id]');

    for (let node of nodes) {
        let playerId = Number(node.getAttribute('player-id'));

        let className = status[playerId];
        node.children[round-1].classList.add('active', className);

        node.lastElementChild.innerHTML = result[playerId].score;

        className = `active ${result[playerId].status}`;
        node.lastElementChild.className = className;
    }
}

function printMessage(message) {
    let print = document.querySelector('.alert');
    
    print.innerHTML = message;
    print.style.display = 'block';
}

function hideMessage() {
    
    let print = document.querySelector('.alert');
    print.style.display = 'None';
}