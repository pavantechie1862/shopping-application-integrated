r,c = list(map(int,input().split()))
m = []
visited = []

for i in range(r):
    m.append([int(j) for j in input().split()])
    visited.append([0 for j in range(c)])
    
dirs = [[0,1],[1,0],[0,-1],[-1,0]]
count = 0 

def dfs(i,j,visited):
    if(i<0 or j<0 or i>= r or j>= c):
        return 
    if(visited[i][j] == 0 and m[i][j] == 1):
        visited[i][j] = 1 
        for dir in dirs:
            n_i = i + dir[0]
            n_j = j + dir[1]
            dfs(n_i,n_j,visited)
            
for i in range(r):
    for j in range(c):
        if(visited[i][j] == 0 and m[i][j] == 1):
            count +=1 
            dfs(i,j,visited)
print(count)
    
        
        
        
        
        
        
        
        
    
