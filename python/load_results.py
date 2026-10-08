"""Загрузка экспорта Magauiya (кнопка «Данные (JSON)») в Python / pandas.
   python load_results.py Magauiya_data_....json
"""
import json, sys
import pandas as pd

def load(path):
    d = json.load(open(path, encoding='utf-8'))
    rows = []
    for s in d['samples']:
        r = {'file': s['file'], 'volume_ml': s['volume_ml'], 'concentration_mln_ml': s['concentration_mln_ml'],
             'total_count_mln': s['total_count_mln'], **{f'who6_{k}': v for k, v in s['who6'].items()},
             **{f'who5_{k}': v for k, v in s['who5'].items()},
             **{f'pctl_{k}': v['percentile'] for k, v in s['percentiles_who2021'].items()},
             **{f'kin_{k}': v for k, v in s['kinematics_motile'].items()}}
        rows.append(r)
    return pd.DataFrame(rows), d

if __name__ == '__main__':
    df, raw = load(sys.argv[1])
    pd.set_option('display.width', 200)
    print(df.T)
