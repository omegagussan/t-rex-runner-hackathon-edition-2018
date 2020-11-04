import numpy as np

learning_rate = .8
y = .95


class Qlearning:
    def __init__(self, observation_space, actions, episodes):
        self.actions = actions
        self.Q = np.zeros([observation_space, len(self.actions)])
        self.rewards = []
        self.num_played = 0
        self.num_episodes = episodes
        self.prior_state = None
        self.action = None
        self.action_penalty = 0

    def select_action(self, state):
        if state is None:
            return "run"
        # Choose an action by greedily (with noise) picking from Q table
        a = np.argmax(self.Q[state, :] + np.random.randn(1, len(self.actions)) * (1. / (self.num_played + 1)))
        self.prior_state = state
        self.action = a
        action_ = self.actions[a]
        if action_ != "run":
            self.action_penalty += 1
        return action_

    def update(self, state, reward):
        print("UPDATING WEIGHTS")
        reward_with_penalty = reward - self.action_penalty
        if state is None:
            return  # We dont have an obstacle
        if self.action is None:
            return  # We dont have an selected action to evaluate
        old_state = self.prior_state
        new_state = state
        # Update Q-Table with new knowledge
        self.Q[old_state, self.action] = self.Q[old_state, self.action] + learning_rate * (
                reward_with_penalty + y * np.max(self.Q[new_state, :]) - self.Q[old_state, self.action])
        self.rewards.append(reward_with_penalty)

        self.prior_state = None  # remove it after being consumed
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
