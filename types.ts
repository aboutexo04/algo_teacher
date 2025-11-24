export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  isStreaming?: boolean;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  prompt: string;
}

export const ALGO_TOPICS: Topic[] = [
  { 
    id: 'intro', 
    title: '🐍 파이썬 코딩 기초',
    description: '코딩 테스트를 위한 파이썬 핵심 문법',
    prompt: '코딩 테스트에서 자주 쓰이는 파이썬의 핵심 문법(List Comprehension, Slice, 기본 라이브러리 등)에 대해 알려주세요. 예제 코드는 반드시 Python으로 작성해주세요.'
  },
  { 
    id: 'array_hash', 
    title: '배열과 해시', 
    description: '데이터 저장과 빠른 검색',
    prompt: '배열(Array)과 해시(Hash/Dictionary)의 개념과 파이썬에서의 효율적인 사용법, 그리고 Two Sum 같은 대표적인 예제에 대해 설명해주세요.'
  },
  { 
    id: 'stack_queue', 
    title: '스택과 큐', 
    description: 'LIFO와 FIFO 구조',
    prompt: '스택(Stack)과 큐(Queue)의 개념을 설명하고, 파이썬의 list와 collections.deque를 사용하여 구현하는 방법을 알려주세요.'
  },
  { 
    id: 'tree', 
    title: '트리 구조', 
    description: '계층적 데이터와 순회',
    prompt: '트리(Tree) 자료구조의 기본 개념과 이진 트리(Binary Tree)의 순회 방법(전위, 중위, 후위)을 설명하고, 파이썬으로 Node 클래스를 만들어 구현하는 예제를 보여주세요.'
  },
  { 
    id: 'heap', 
    title: '힙과 우선순위 큐', 
    description: '최댓값/최솟값 빠르게 찾기',
    prompt: '힙(Heap) 자료구조의 개념과 우선순위 큐의 동작 원리를 설명하고, 파이썬의 heapq 모듈을 사용하여 최소 힙과 최대 힙을 다루는 방법을 알려주세요.'
  },
  { 
    id: 'dfs_bfs', 
    title: 'DFS / BFS', 
    description: '그래프 탐색의 기초',
    prompt: '깊이 우선 탐색(DFS)과 너비 우선 탐색(BFS)의 차이점과 파이썬 구현 패턴, 그리고 어떤 문제 유형(예: 미로 찾기, 최단 거리)에 쓰이는지 알려주세요.'
  },
  { 
    id: 'dp', 
    title: '다이나믹 프로그래밍', 
    description: '복잡한 문제를 나누어 풀기',
    prompt: '동적 계획법(DP)의 핵심 개념(Memoization, Tabulation)과 피보나치 수열을 통한 파이썬 예제를 설명해주세요.'
  },
  { 
    id: 'greedy', 
    title: '그리디 알고리즘', 
    description: '현재 최선의 선택',
    prompt: '탐욕 알고리즘(Greedy)의 개념과 파이썬으로 풀 수 있는 대표적인 예제(거스름돈 문제, 회의실 배정 등)를 설명해주세요.'
  }
];