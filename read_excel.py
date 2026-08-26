import pandas as pd
df = pd.read_excel(r'C:\Users\MSI\Downloads\mẫu phụ lục.xlsx', sheet_name=0, header=2)
print(df.columns.tolist())
