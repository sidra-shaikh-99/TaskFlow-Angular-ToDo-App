import { Pipe, PipeTransform } from '@angular/core';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface TodoItem {
  id: string;
  title: string;
  category: string;
  priority: string;
  dueDate: string;
  status: string;
  pinned: boolean;
  subtasks: Subtask[];
  notes: string;
  listId: string;
  createdAt: string;
}

@Pipe({ name: 'listCount', standalone: true, pure: false })
export class ListCountPipe implements PipeTransform {
  transform(todos: TodoItem[], listId: string): number {
    return todos.filter(t => t.listId === listId).length;
  }
}

@Pipe({ name: 'doneCount', standalone: true, pure: false })
export class DoneCountPipe implements PipeTransform {
  transform(subtasks: Subtask[]): number {
    return subtasks.filter(s => s.done).length;
  }
}