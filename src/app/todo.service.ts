import { Injectable, signal, computed } from '@angular/core';
import { Todo, ProjectList } from './app';

@Injectable({
  providedIn: 'root'
})
export class TodoService {

  private _todos = signal<Todo[]>([]);
  private _lists = signal<ProjectList[]>([]);
  private _activeListId = signal<string>('');

  // expose readonly signals
  todos = this._todos.asReadonly();
  lists = this._lists.asReadonly();
  activeListId = this._activeListId.asReadonly();

  // 🔥 internal computed (signal)
  private _activeTodos = computed(() =>
    this._todos().filter(t => t.listId === this._activeListId())
  );

  // ✅ FIX: normal function (array return karega)
  activeTodos(): Todo[] {
    return this._activeTodos();
  }

  private _completedCount = computed(() =>
    this._activeTodos().filter(t => t.status === 'done').length
  );

  completedCount(): number {
    return this._completedCount();
  }

  private _progressPercent = computed(() => {
    const all = this._activeTodos().length;
    if (!all) return 0;
    return Math.round((this._completedCount() / all) * 100);
  });

  progressPercent(): number {
    return this._progressPercent();
  }

  constructor() {
    this.loadFromStorage();
    if (this._lists().length === 0) {
      this.initDefaultLists();
    }
  }

  private loadFromStorage(): void {
    const savedLists  = localStorage.getItem('taskflow-lists');
    const savedTodos  = localStorage.getItem('taskflow-todos-v2');
    const savedActive = localStorage.getItem('taskflow-active-list');

    this._lists.set(savedLists ? JSON.parse(savedLists) : []);
    this._todos.set(savedTodos ? JSON.parse(savedTodos) : []);
    this._activeListId.set(savedActive || this._lists()[0]?.id || '');
  }

  private saveToStorage(): void {
    localStorage.setItem('taskflow-lists', JSON.stringify(this._lists()));
    localStorage.setItem('taskflow-todos-v2', JSON.stringify(this._todos()));
    localStorage.setItem('taskflow-active-list', this._activeListId());
  }

  private initDefaultLists(): void {
    const lists: ProjectList[] = [
      { id: this.genId(), name: 'Personal', color: '#6366f1', icon: '🏠' },
      { id: this.genId(), name: 'Work',     color: '#f59e0b', icon: '💼' },
      { id: this.genId(), name: 'College',  color: '#10b981', icon: '🎓' },
    ];
    this._lists.set(lists);
    this._activeListId.set(lists[0].id);
    this.saveToStorage();
  }

  genId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  getActiveList(): ProjectList | undefined {
    return this._lists().find(l => l.id === this._activeListId());
  }

  switchList(listId: string): void {
    this._activeListId.set(listId);
    this.saveToStorage();
  }

  createList(name: string, icon: string, color: string): void {
    const list: ProjectList = { id: this.genId(), name, icon, color };
    this._lists.update(lists => [...lists, list]);
    this._activeListId.set(list.id);
    this.saveToStorage();
  }

  deleteList(listId: string): void {
    this._lists.update(lists => lists.filter(l => l.id !== listId));
    this._todos.update(todos => todos.filter(t => t.listId !== listId));
    this._activeListId.set(this._lists()[0]?.id || '');
    this.saveToStorage();
  }

  addTodo(todo: Omit<Todo, 'id' | 'createdAt'>): void {
    const newTodo: Todo = {
      ...todo,
      id: this.genId(),
      createdAt: new Date().toISOString()
    };
    this._todos.update(todos => [...todos, newTodo]);
    this.saveToStorage();
  }

  updateTodo(updatedTodo: Todo): void {
    this._todos.update(todos =>
      todos.map(t => t.id === updatedTodo.id ? updatedTodo : t)
    );
    this.saveToStorage();
  }

  deleteTodo(id: string): void {
    this._todos.update(todos => todos.filter(t => t.id !== id));
    this.saveToStorage();
  }

  togglePin(id: string): void {
    this._todos.update(todos =>
      todos.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t)
    );
    this.saveToStorage();
  }

  toggleDone(id: string): void {
    this._todos.update(todos =>
      todos.map(t => t.id === id
        ? { ...t, status: t.status === 'done' ? 'active' : 'done' }
        : t
      )
    );
    this.saveToStorage();
  }

  setStatus(id: string, status: 'active' | 'inprogress' | 'done'): void {
    this._todos.update(todos =>
      todos.map(t => t.id === id ? { ...t, status } : t)
    );
    this.saveToStorage();
  }

  toggleSubtask(todoId: string, subtaskId: string): void {
    this._todos.update(todos =>
      todos.map(t => {
        if (t.id !== todoId) return t;
        const subtasks = t.subtasks.map(s =>
          s.id === subtaskId ? { ...s, done: !s.done } : s
        );
        const done = subtasks.filter(s => s.done).length;
        const all  = subtasks.length;
        const status = all === 0 ? t.status
          : done === all ? 'done'
          : done > 0    ? 'inprogress'
          : 'active';
        return { ...t, subtasks, status } as Todo;
      })
    );
    this.saveToStorage();
  }

  getTaskCounts() {
    const list = this.activeTodos();
    return {
      all: list.length,
      active: list.filter(t => t.status === 'active').length,
      inprogress: list.filter(t => t.status === 'inprogress').length,
      done: list.filter(t => t.status === 'done').length,
    };
  }

  getListCount(listId: string): number {
    return this._todos().filter(t => t.listId === listId).length;
  }
}