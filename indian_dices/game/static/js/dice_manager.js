export const USER = 0;
export const BOT = 1;
export const DICE_COUNT = 5;

export default class DiceManager {
    
    radius = 150;
    pi2 = 360;

    rotate = new Map([
        
        [1, {x: 0, y: 0, z: 0}], 
        [2, {x: -90, y: 0, z: 0}],
        
        [3, {x: 0, y: 90, z: 0}], 
        [4, {x: 0, y: -90, z: 0}],
        
        [5, {x: 90, y: 0, z: 0}], 
        [6, {x: 180, y: 0, z: 0}],
    ])

    constructor() {
        
        this.setupPlayAreaCoords();
        this.setupDiceSize();
        this.setupDiceCupCoords();
        
        this.setupBoardPlaces();
        this.setupDices();

        this.setupDicePositionsOnTable();
        this.setupDiceToBoard();
    }

    setupPlayAreaCoords() {

        let coords = document.querySelector('.play-area'
                ).getBoundingClientRect();

        this.playArea = { x: coords.x, y: coords.y};
    }

    setupDiceCupCoords() {

        let coords = document.querySelector('#dice-cup'
                ).getBoundingClientRect();
        
        let x = coords.x + (coords.width - this.dice.width) / 2 - this.playArea.x;
        let y = coords.y + (coords.height - this.dice.height) / 2  - this.playArea.y;

        this.diceCup = { x: x, y: y };
    }

    setupDicePositionsOnTable() {
        let [centerX, centerY] = this.getTableCoords()

        this.diceToTable = new Map();
        let diceIds = Array.from(this.dices.keys());
        
        let angle = 2 * Math.PI / DICE_COUNT;
        let shift = Math.PI / 2;

        for (let i = 0; i < DICE_COUNT; ++i) {
            
            let x = centerX + Math.cos(angle * i + shift) * 
                this.radius - this.dice.width / 2;
            
            let y = centerY - Math.sin(angle * i + shift) * 
                this.radius - this.dice.height / 2;

            let position = { x: x, y: y };
            this.diceToTable.set(diceIds[i], position);
        }
    }

    setupBoardPlaces() {

        let places = document.querySelectorAll('.place');
        this.places = [[], []]; let id = '#bot';

        for (let place of places) {
            
            let placeCoords = place.getBoundingClientRect()
            let player = place.closest(id) ? BOT : USER;

            let x = placeCoords.x - this.playArea.x;
            let y = placeCoords.y - this.playArea.y;

            let state = { coords: { x: x, y: y }, filled: false };
            this.places[player].push(state);
        }

        for (let place of this.places) {
            place.sort((a, b) => a.x - b.x);
        }
    }

    setupDiceToBoard() {
        this.diceToBoard = new Map();

        for (let id of this.dices.keys()) {
            this.diceToBoard.set(id, null);
        }
    }

    setupDices() {

        let dices = document.querySelectorAll('.dice-wrapper');
        this.dices = new Map();

        for (let dice of dices) {
            
            let diceId = Number(dice.getAttribute('dice-id'));
            let diceObj = { score: null, ontable: true };
            
            this.dices.set(diceId, diceObj);
        }
    }

    getTableCoords() {

        let coords = document.querySelector('.game-table'
                ).getBoundingClientRect();
        
        let x = coords.x + coords.width / 2 - this.playArea.x;
        let y = coords.y + coords.height / 2  - this.playArea.y;
        
        return [x, y]
    }

    getFirstOnBoard(player) {
        
        for (let i = 0; i < this.places[player].length; ++i) {
            if (!this.places[player][i].filled) { 
                return i; 
            }
        }
        return null;
    }

    getPlacesOnTable() {  
        let result = new Array()

        for (let [id, value] of this.dices.entries()) {
            if (value.ontable) { result.push(id); }
        }
        return result;
    }

    getValuesOnBoard() {
        let result = new Array()

        for (let value of this.dices.values()) {
            if (!value.ontable) { 
                result.push(value.score); 
            }
        }
        return result;
    }

    async animateDiceMove(target, to, options, angle=null) {

        let coords = target.getBoundingClientRect();
        let from = {x : coords.x, y : coords.y};

        options.fill = 'forwards';

        let moveAnimation = target.animate([
            { left: `${from.x}px`, top: `${from.y}px` }, 
            
            { left: `${to.x}px`, top: `${to.y}px` }
        ], options);

        if (!angle) { 
            return await moveAnimation.finished; 
        }
        
        let initProp = target.style.perspectiveOrigin;

        target.animate([
            {perspectiveOrigin: initProp},
            
            {perspectiveOrigin: '200% 0%', offset: 0.2},
            {perspectiveOrigin: '200% 100%', offset: 0.4},
            
            {perspectiveOrigin: '-50% 100%', offset: 0.6},
            {perspectiveOrigin: '-50% 0%', offset: 0.8},
            
            {perspectiveOrigin: initProp}
        ], options);

        await target.firstElementChild.animate([
            { transform: `rotate(0deg) rotateX(0deg) rotateY(0deg)` },
            
            { transform: `rotateX(${angle.x}deg) rotateY(${angle.y}deg)
                    rotateZ(${angle.z}deg)` }
        ], options).finished;
    }

    mapDiceIdToScore() {
        let dices = [new Map(), new Map()];
        
        for (let [diceId, value] of this.dices.entries()) {
            
            let idx = value.ontable ? 0 : 1;
            let score = value.score;
            
            if (dices[idx].has(score)) {
                dices[idx].get(score).push(diceId);
            } else {
                dices[idx].set(score, [diceId]);
            }
        }

        return dices;
    }

    getDiceIdByScore(values) {
        let diceIds = [new Set(), new Set()];

        let dices = this.mapDiceIdToScore();
        for (let i = 0; i < values.length; ++i) {
            
            for (let score of values[i]) {
                for (let id of dices[i].get(score)) {
                    
                    if (!diceIds[i].has(id)) { 
                        diceIds[i].add(id); break; 
                    }
                } 
            }
        }

        return Array.from(diceIds[1]).concat(
            Array.from(diceIds[0]));
    }

    async moveDices(scores) {
        
        let onboard = this.getValuesOnBoard(), deleted = [];
        scores = this.makeIterable(scores);
         
        for (let score of onboard) {
            if (scores.includes(score)) {
                scores.splice(scores.indexOf(score), 1);
            } else {
                deleted.push(score);    
            }
        }

        let values = [scores, deleted]
        let diceIds = this.getDiceIdByScore(values);

        for (let diceId of diceIds) {
            let selector = `.dice-wrapper[dice-id='${diceId}']`;
            
            let target = document.querySelector(selector);
            await this.moveDice(target, BOT);
        }
    }

    async moveAllToTable(player) {
        for (let [id, value] of this.dices.entries()) {
            
            if (!value.ontable) {
                let selector = `.dice-wrapper[dice-id='${id}']`;
            
                let target = document.querySelector(selector);
                await this.moveDice(target, player);
            }
        }
    }

    async moveDice(target, player) {
        
        let diceId = Number(target.getAttribute('dice-id'));
        let placeId = null, coords = null;

        let dice = this.dices.get(diceId);

        if (dice.ontable) {

            placeId = this.getFirstOnBoard(player);
            coords = this.places[player][placeId].coords;

            this.diceToBoard.set(diceId, placeId);

        } else {
         
            placeId = this.diceToBoard.get(diceId);
            coords = this.diceToTable.get(diceId);

            this.diceToBoard.set(diceId, null);
        }
        
        dice.ontable = !dice.ontable;
        this.places[player][placeId].filled ^= true;

        let options = {duration: 400, easing: 'ease'};
        await this.animateDiceMove(target, coords, options);
    }

    async rollDices(scores, first=false) {

        let diceIds = this.getPlacesOnTable();
        let dices = new Array();

        for (let i = 0; i < scores.length; ++i) {
            this.dices.get(diceIds[i]).score = scores[i];
            
            let selector = `.dice-wrapper[dice-id='${diceIds[i]}']`;
            dices.push(document.querySelector(selector));
        }

        await this.animateDiceRoll(dices, first);
    }

    async animateDiceRoll(dices, first) {
        let animations;

        if (!first) {
            animations = new Array();

            for (let dice of dices) {
                
                let options = {duration: 400};
                animations.push(this.animateDiceMove(dice,this.diceCup, options));
            }
            await Promise.all(animations);
        }

        animations = new Array();

        for(let dice of dices) {
            
            let diceId = Number(dice.getAttribute('dice-id'));
            let to = this.diceToTable.get(diceId);
            
            let score = this.dices.get(diceId).score;
            let angle = this.getRotateAngle(score);

            let options = {duration: 600};
            animations.push(this.animateDiceMove(dice, to, options, angle));
        }

        await Promise.all(animations);
    }

    setupDiceSize() {

        let coords = document.querySelector('.dice'
            ).getBoundingClientRect()

        this.dice = {width: coords.width, height: coords.height};
    }

    getRotateAngle(score) {
        let angle = Object.assign({}, this.rotate.get(score));
        
        let keys = Object.keys(angle);
        let randInts = this.getRandomInts(2, keys.length);        
        
        for (let i = 0; i < keys.length; ++i) {
            angle[keys[i]] += randInts[i] * this.pi2;
        }
        return angle;
    }

    getRandomInts(max, length) {
        let randInts = new Array(length);
        
        for (let i = 0; i < length; ++i) {
            randInts[i] = Math.floor(Math.random() * (max + 1));
        }
        return randInts;
    }

    sleep(time) {
        return new Promise(resolved => setTimeout(resolved, time));
    }

    makeIterable(values) {
        if (!this.isIterable(values)) {
            return [values];
        }
        return values;
    }

    isIterable(values) {
        if (values == null) { 
            return false; 
        }
        return typeof values[Symbol.iterator] === 'function';
    }
}