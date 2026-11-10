import { Routes } from '@angular/router';
import { BoardViewComponent, CalendarViewComponent } from './components';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'board',
    pathMatch: 'full'
  },
  {
    path: 'board',
    component: BoardViewComponent,
    title: 'Second Brain — Board'
  },
  {
    path: 'board/:date',
    component: BoardViewComponent,
    title: 'Second Brain — Board'
  },
  {
    path: 'calendar',
    component: CalendarViewComponent,
    title: 'Second Brain — Calendar'
  },
  {
    path: '**',
    redirectTo: 'board'
  }
];
