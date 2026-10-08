#!/usr/bin/env python3
"""Обучение классификатора «головка / мусор» по размеченным патчам.
Вход: npz с массивами P (N,48,48,3 uint8) и y (N, 1=головка, 0=мусор, -1=неясно).
  python train_classifier.py labeled.npz -o head_model.pkl
"""
import argparse, pickle, numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from headclf import features, augment


def train(P, y):
    X, Y, W = [], [], []
    for p, l in zip(P, y):
        if l < 0:
            continue
        aug = augment(p)
        for q in aug:
            X.append(features(q)); Y.append(l); W.append(1.0 / len(aug))
    m = HistGradientBoostingClassifier(max_iter=200, learning_rate=0.05, max_leaf_nodes=15, l2_regularization=1.0, random_state=0)
    m.fit(np.array(X), np.array(Y), sample_weight=np.array(W))
    return m


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('data'); ap.add_argument('-o', default='head_model.pkl')
    a = ap.parse_args()
    d = np.load(a.data)
    m = train(d['P'], d['y'])
    pickle.dump(m, open(a.o, 'wb'))
    print('сохранено', a.o)
