import { Component, DestroyRef, OnInit, effect, inject, signal } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import {
  HeaderComponent,
  ItemModalComponent,
  PrintShareModalComponent
} from './components';
import { ScheduleStateService } from './services';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    ItemModalComponent,
    PrintShareModalComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  readonly title = 'Second Brain';
  readonly scheduleState = inject(ScheduleStateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  readonly isCalendarOpen = signal(false);

  constructor() {
    effect(() => {
      const theme = this.scheduleState.resolvedCircadianTheme();
      if (this.document?.body) {
        this.document.body.dataset['circadian'] = theme;
      }
    });
  }

  ngOnInit(): void {
    this.isCalendarOpen.set(this.router.url.startsWith('/calendar'));

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => {
        this.isCalendarOpen.set(event.urlAfterRedirects.startsWith('/calendar'));
      });
  }

  toggleCalendarView(): void {
    if (this.isCalendarOpen()) {
      this.router.navigate(['/board']);
    } else {
      this.router.navigate(['/calendar']);
    }
  }
}
