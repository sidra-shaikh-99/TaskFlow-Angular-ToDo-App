import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ListCountPipe, DoneCountPipe } from './pipes';
import { TodoService } from './todo.service';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Todo {
  id: string;
  title: string;
  category: 'Work' | 'Personal' | 'Study';
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  status: 'active' | 'inprogress' | 'done';
  pinned: boolean;
  subtasks: Subtask[];
  notes: string;
  listId: string;
  createdAt: string;
}

export interface ProjectList {
  id: string;
  name: string;
  color: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ListCountPipe, DoneCountPipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit {

  constructor(
    public todoService: TodoService,
    private fb: FormBuilder
  ) {}

  addTaskForm!: FormGroup;
  editTaskForm!: FormGroup;
  newListForm!: FormGroup;

  showAddModal = false;
  showEditModal = false;
  showNewListModal = false;
  editTodo: Todo | null = null;

  newSubtasks: Subtask[] = [];
  newSubtaskText = '';
  editSubtaskText = '';

  searchQuery = signal('');
  activeTab   = signal<'all' | 'active' | 'inprogress' | 'done'>('all');
  sortBy      = signal<'date' | 'priority' | 'az'>('date');

  availableIcons  = ['📋','💼','🎓','🏠','🏋️','🎯','🚀','💡','🎨','🛒'];
  availableColors = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#14b8a6'];

  ngOnInit(): void {
    this.addTaskForm = this.fb.group({
      title:    ['', [Validators.required]],
      priority: ['Medium', Validators.required],
      category: ['Work', Validators.required],
      dueDate:  [''],
      notes:    ['']
    });
    this.editTaskForm = this.fb.group({
      title:    ['', [Validators.required]],
      priority: ['Medium', Validators.required],
      category: ['Work', Validators.required],
      dueDate:  [''],
      notes:    ['']
    });
    this.newListForm = this.fb.group({
      name:  ['', [Validators.required]],
      icon:  ['📋'],
      color: ['#6366f1']
    });
  }

  get lists()           { return this.todoService.lists(); }
  get todos()           { return this.todoService.todos(); }
  get activeListId()    { return this.todoService.activeListId(); }
  get activeList()      { return this.todoService.getActiveList(); }
  get progressPercent() { return this.todoService.progressPercent(); }
  get taskCounts()      { return this.todoService.getTaskCounts(); }

  get searchQueryValue()          { return this.searchQuery(); }
  set searchQueryValue(v: string) { this.searchQuery.set(v); }
  get activeTabValue()            { return this.activeTab(); }
  get sortByValue()               { return this.sortBy(); }

  setActiveTab(tab: 'all'|'active'|'inprogress'|'done') { this.activeTab.set(tab); }
  setSortBy(sort: 'date'|'priority'|'az')               { this.sortBy.set(sort); }

  get filteredTodos(): Todo[] {
    const todos = this.todoService.activeTodos();
    const tab   = this.activeTab();
    const q     = this.searchQuery().toLowerCase();
    const sort  = this.sortBy();

    let list = tab === 'all' ? todos : todos.filter(t => t.status === tab);

    if (q) {
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (sort === 'priority') {
        const p = { High: 0, Medium: 1, Low: 2 };
        return p[a.priority] - p[b.priority];
      }
      if (sort === 'az') return a.title.localeCompare(b.title);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  switchList(listId: string): void {
    this.todoService.switchList(listId);
    this.activeTab.set('all');
    this.searchQuery.set('');
  }

  openNewListModal(): void {
    this.newListForm.reset({ name: '', icon: '📋', color: '#6366f1' });
    this.showNewListModal = true;
  }

  createList(): void {
    if (this.newListForm.invalid) return;
    const { name, icon, color } = this.newListForm.value;
    this.todoService.createList(name.trim(), icon, color);
    this.showNewListModal = false;
  }

  deleteList(listId: string): void {
    if (this.lists.length === 1) { alert('At least one list required!'); return; }
    if (!confirm('Delete this list and ALL its tasks?')) return;
    this.todoService.deleteList(listId);
  }

  openAddModal(): void {
    this.addTaskForm.reset({ title: '', priority: 'Medium', category: 'Work', dueDate: '', notes: '' });
    this.newSubtasks    = [];
    this.newSubtaskText = '';
    this.showAddModal   = true;
  }

  addNewSubtaskToForm(): void {
    const t = this.newSubtaskText.trim();
    if (!t) return;
    this.newSubtasks.push({ id: this.todoService.genId(), title: t, done: false });
    this.newSubtaskText = '';
  }

  removeNewSubtask(id: string): void {
    this.newSubtasks = this.newSubtasks.filter(s => s.id !== id);
  }

  addTask(): void {
    if (this.addTaskForm.invalid) return;
    const f = this.addTaskForm.value;
    this.todoService.addTodo({
      title:    f.title.trim(),
      category: f.category,
      priority: f.priority,
      dueDate:  f.dueDate || '',
      status:   'active',
      pinned:   false,
      subtasks: [...this.newSubtasks],
      notes:    f.notes?.trim() || '',
      listId:   this.activeListId
    });
    this.showAddModal = false;
  }

  openEdit(todo: Todo): void {
    this.editTodo = JSON.parse(JSON.stringify(todo));
    this.editTaskForm.patchValue({
      title:    todo.title,
      priority: todo.priority,
      category: todo.category,
      dueDate:  todo.dueDate,
      notes:    todo.notes
    });
    this.editSubtaskText = '';
    this.showEditModal   = true;
  }

  addSubtaskToEdit(): void {
    if (!this.editTodo) return;
    const t = this.editSubtaskText.trim();
    if (!t) return;
    this.editTodo.subtasks.push({ id: this.todoService.genId(), title: t, done: false });
    this.editSubtaskText = '';
  }

  removeSubtaskFromEdit(id: string): void {
    if (!this.editTodo) return;
    this.editTodo.subtasks = this.editTodo.subtasks.filter(s => s.id !== id);
  }

  saveEdit(): void {
    if (!this.editTodo || this.editTaskForm.invalid) return;
    const f = this.editTaskForm.value;
    this.todoService.updateTodo({
      ...this.editTodo,
      title:    f.title.trim(),
      priority: f.priority,
      category: f.category,
      dueDate:  f.dueDate || '',
      notes:    f.notes?.trim() || ''
    });
    this.showEditModal = false;
    this.editTodo      = null;
  }

  cancelEdit(): void {
    this.showEditModal = false;
    this.editTodo      = null;
  }

  deleteTask(id: string)                                   { this.todoService.deleteTodo(id); }
  togglePin(todo: Todo)                                    { this.todoService.togglePin(todo.id); }
  toggleDone(todo: Todo)                                   { this.todoService.toggleDone(todo.id); }
  setStatus(todo: Todo, s: 'active'|'inprogress'|'done')  { this.todoService.setStatus(todo.id, s); }

  toggleSubtask(todo: Todo, subtask: Subtask): void {
    this.todoService.toggleSubtask(todo.id, subtask.id);
  }

  subtaskProgress(todo: Todo): number {
    if (!todo.subtasks.length) return 0;
    return Math.round((todo.subtasks.filter(s => s.done).length / todo.subtasks.length) * 100);
  }

  isOverdue(todo: Todo): boolean {
    if (!todo.dueDate || todo.status === 'done') return false;
    const d = new Date(); d.setHours(0,0,0,0);
    return new Date(todo.dueDate) < d;
  }

  isDueToday(todo: Todo): boolean {
    if (!todo.dueDate || todo.status === 'done') return false;
    return todo.dueDate === new Date().toISOString().split('T')[0];
  }

  dueDateLabel(todo: Todo): string {
    if (!todo.dueDate)         return '';
    if (this.isOverdue(todo))  return '⚠ Overdue';
    if (this.isDueToday(todo)) return '📅 Due Today';
    return '📅 ' + todo.dueDate;
  }
}