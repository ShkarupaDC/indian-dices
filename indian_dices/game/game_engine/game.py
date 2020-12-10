import time, random
import numpy as np
from typing import List, Tuple, Dict
from collections import Counter
from .utils import powerset_of_uniques, all_moves, get_random_dices

USER, BOT = 0, 1

class Game():
    
    cashed_scores = dict()

    combinations = {
        'Without Pairs' : 1,   
        'One Pair' : 2,
        'Two Pairs' : 3,  
        'Three Of A Kind' : 4,
        'Full House' : 5, 
        'Four Of A Kind' : 6,
        'Five Of A Kind' : 7
    }

    def __init__(self) -> None:
        
        self.move_count, self.dice_count = 3, 5
        self.move_idx, self.round = 0, 1
        self.player, self.bot = None, Bot()
        
        self.scores = np.array([np.nan, np.nan])
        self.result =  np.zeros(2)


    def get_state(self) -> Dict[str, int]:

        allowed =  self.move_idx < self.move_count
        return {'round': self.round, 'allowed': allowed, 'player': self.player}

    
    def get_first_turn(self) -> int:
        
        self.player = random.choice([USER, BOT])
        return self.player

    
    def set_score(self, score: int) -> None:
        self.scores[self.player] = score
        

    def update_state(self) -> bool:
        
        self.player = (self.player + 1) % 2
        all_moved = not np.isnan(self.scores).any()

        if all_moved == True:
            
            if (self.scores == self.scores[BOT]).all():
                self.result += 1
            else: self.result[self.scores.argmax()] += 1
 
            self.saved = self.scores
            self.scores = np.array([np.nan, np.nan])

            self.round += 1; self.bot.update()
            self.move_count = 3
        
        else:
            self.move_count = self.move_idx; 
       
        self.move_idx = 0; return all_moved

        
    def get_user_moves(self, onboard: List[int] or Tuple[int]):
        self.move_idx += 1

        count = self.dice_count - len(onboard)
        rand = get_random_dices(count)

        values = onboard + rand
        moves = Game.get_moves(values)

        return rand, moves
            

    def get_bot_dices(self) -> List[int]:
        self.move_idx += 1

        count = self.dice_count - len(self.bot.onboard)
        self.bot.rand = get_random_dices(count)

        return self.bot.rand

    
    def get_bot_move(self) -> Tuple[List[int], bool]:
        values = self.bot.rand + list(self.bot.onboard)
        
        last = not np.isnan(self.scores).all()
        moves = self.move_count - self.move_idx

        self.bot.onboard = self.bot.ai.run(values, moves, last)
        last = True if len(self.bot.onboard) == self.dice_count else False
        
        if last == True:    
            score = Game.get_score(self.bot.onboard)
            self.set_score(score)
        
        return self.bot.onboard, last


    def get_result(self) -> Tuple[List[int], bool]:
        response, over = [], False
        
        for data in [self.saved, self.result]:
            response.append([int(x) for x in data])
        
        if abs(self.result[1] - self.result[0]) == 2\
            or self.round == 4: over = True

        return response, over


    def get_value(self) -> float:
        return self.scores[self.player]


    def get_winner(self) -> int:
        return int(np.argmax(self.result)) if self.result[ 0] != self.result[1] else None


    @staticmethod
    def get_score(dice_list: List[int] or Tuple[int]) -> int:
        dices = tuple(sorted(dice_list))
        
        if dices in Game.cashed_scores:
            return Game.cashed_scores.get(dices)

        counts = [*Counter(dices).values()]
        uniques = len(counts)

        if uniques == 1: name = 'Five Of A Kind'
        elif uniques == 5: name ='Without Pairs'

        else:
            repeats = dict(Counter(counts).items())

            if 4 in repeats: name = 'Four Of A Kind'

            elif 3 in repeats:
                if 2 in repeats: name = 'Full House'                
                else: name = 'Three Of A Kind'

            elif 2 in repeats:
                if repeats.get(2) == 2: name = 'Two Pairs'
                else: name = 'One Pair'

        score = Game.combinations[name]
        Game.cashed_scores[dices] = score
        
        return score

    @staticmethod
    def get_moves(dices: List[int] or Tuple[int]) -> List[str]:
        
        counts = [*Counter(dices).values()]
        repeats = dict(Counter(counts).items())
        
        if len(counts) == 5: return ['Without Pairs']

        allowed, names = [], ['One Pair', 'Three Of A Kind', 'Four Of A Kind', 'Five Of A Kind']

        for value in range(2, len(names) + 2):
            if value in repeats:
                if value + 1 in repeats: continue

                allowed += names[:value-1]; break

        if 2 in repeats:
            if repeats.get(2) == 2:
                 allowed += ['Two Pairs']
            
            elif 3 in repeats:
                allowed += ['Two Pairs', 'Full House']

        return allowed

    @staticmethod
    def estimate_move(moves: List[Tuple[List[int], float]]) -> float:
        estimation = 0

        for [dices, prob] in moves:
            score = Game.get_score(dices)
            estimation += prob * score
        
        return estimation


class AI():

    def __init__(self, dice_count=5) -> None:
        
        self.dice_count = dice_count
        self.all_moves = []
        
        for idx in range(dice_count + 1):
            moves = [move for move in all_moves(idx)]

            self.all_moves.append(moves)
            if idx == dice_count: self.empty = Game.estimate_move(moves)
            

    def run(self, dices: List[int] or Tuple[int], max_depth: int=2, last: bool=True) -> Tuple[int]:
        
        self.best_move = tuple(dices)
        self.eps = 0.1 if not last else 0

        self.recursive_max(dices, 0, max_depth)
        return self.best_move


    def recursive_max(self, dices: List[int] or Tuple[int], depth: int = 0, max_depth: int = 2) -> float:
        if depth == max_depth: return Game.get_score(dices)
        
        value = float('-inf')
        for move in powerset_of_uniques(dices):
            
            dice_count = self.dice_count - len(move)
            estimation = 0
            
            if not move: estimation = self.empty

            elif not dice_count:
                estimation = (1 + (max_depth - depth) * self.eps) * Game.get_score(move)
            
            else:    
                for combination, prob in self.all_moves[dice_count]:    
                    
                    next_dices = move + combination
                    estimation += prob * self.recursive_max(next_dices, depth + 1)
            
            if estimation > value:
                
                value = estimation
                if not depth: self.best_move = move
        
        return value

class Bot():

    def __init__(self) -> None:
        
        self.update()
        self.ai = AI()

    def update(self) -> None:

        self.onboard = []
        self.rand = []