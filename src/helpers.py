import time


async def slow_countdown(start: int = 3):
    for count in reversed(range(1, start + 1)):
        print(count)
        time.sleep(1)
    return
