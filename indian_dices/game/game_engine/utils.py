import random
from typing import List, Tuple
from itertools import chain,repeat,islice,count
from collections import Counter

FACES_COUNT = 6

def get_random_dices(count: int) -> List[int]:
    return [random.randint(1, FACES_COUNT) for _ in range(count)]


def norepeat_combinations(iterable: List[int] or Tuple[int], n: int):
    values, counts = zip(*Counter(iterable).items())

    function = lambda num, count: chain.from_iterable(
        map(repeat, num, count))
    
    length = len(counts)
    indices = list(islice(function(count(),counts), n))

    if len(indices) < n: return

    while True:
        yield tuple(values[i] for i in indices)
        
        for i, j in zip(reversed(range(n)), function(reversed(range(length)), reversed(counts))):
            if indices[i] != j:
                break
        else:
            return
        
        j = indices[i]+1
        for i, j in zip(range(i, n), function(count(j), islice(counts, j, None))):
            indices[i] = j


def powerset_of_uniques(iterable: List[int] or Tuple[int]):

    n = len(iterable)
    return chain.from_iterable(norepeat_combinations(iterable, i) for i in range(n + 1))


def all_moves(dice_count: int) -> Tuple[int, float]:

    pool = list(range(1, FACES_COUNT + 1))
    pools = [tuple(pool) for _ in range(dice_count)]
    
    all_count  = FACES_COUNT ** dice_count
    result = [[]]

    for pool in pools:
        result = [x + [y] for x in result for y in pool]
    
    result = list(map(lambda x: tuple(sorted(x)), result))
    
    for value, count in Counter(result).items():
        yield (value, count / all_count)


def parse_response(response):
    
    [scores, results], result = response, []
    
    status = win_lose_draw(scores)
    r_status = win_lose_draw(results)

    for idx, value in enumerate(results):
        result.append({'status': r_status[idx], 'score': value})

    return {'status': status, 'result': result}


def win_lose_draw(values):
    first, second = values

    if first == second:
        status = ['draw', 'draw']
    else:
        if max(*values) == first:
            status = ['win', 'lose']    
        else: status = ['lose', 'win']

    return status
