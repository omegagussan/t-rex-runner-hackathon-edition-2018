import numpy as np

learning_rate = .8
y = .95


class Qlearning:
    def __init__(self, width, height, actions, episodes):
        self.actions = actions
        self.Q = np.zeros([width * height, len(self.actions)])  # we are packing state one after the other
        self.Q[:, 1] = 1
        self.rewards = []
        self.width = width
        self.num_played = 0
        self.num_episodes = episodes
        self.prior_state = None
        self.action = None
        self.action_penalty = 0

    def select_action_training(self, state):
        if state is None or (state[0] is None and state[1] is None):
            return "run"

        idx = self.get_index_from_state(state)
        # Choose an action by greedily (with noise) picking from Q table
        a = np.argmax(self.Q[idx, :] + np.random.randn(1, len(self.actions)) * (1. / (self.num_played + 1)))
        self.prior_state = state
        self.action = a
        action_ = self.actions[a]
        if action_ != "run":
            self.action_penalty += 1
        return action_

    def get_index_from_state(self, state):
        if state[0] is None:
            idx = state[1] + self.width
        else:
            idx = state[0]
        return idx

    def select_action_evaluation(self, state):
        if state is None or (state[0] is None and state[1] is None):
            return "run"

        idx = self.get_index_from_state(state)
        a = np.argmax(self.Q[idx, :])
        action_ = self.actions[a]
        return action_

    def update(self, state, reward, is_crashed=False):
        if state is None or (state[0] is None and state[1] is None):
            return
        if self.prior_state is None:
            return
        if self.action is None:
            return

        reward_with_penalty = reward - self.action_penalty
        if is_crashed:
            reward_with_penalty = reward_with_penalty - 50

        old_idx = self.get_index_from_state(self.prior_state)
        new_idx = self.get_index_from_state(state)
        # Update Q-Table with new knowledge
        self.Q[old_idx, self.action] = self.Q[old_idx, self.action] + learning_rate * (
                reward_with_penalty + y * np.max(self.Q[new_idx, :]) - self.Q[old_idx, self.action])

        self.rewards.append(reward_with_penalty)
        self.prior_state = None
        self.action = None

    def is_done(self):
        return not self.num_played < self.num_episodes

    def increment_played(self):
        self.num_played += 1
        self.action = None
        self.prior_state = None
        self.action_penalty = 0

    def get_score_over_time(self):
        return sum(self.rewards) / self.num_episodes

    def get_rewards(self):
        return self.rewards

    def get_Q(self):
        return self.Q

    def load_Q(self, path):
        self.Q = np.load(path)
