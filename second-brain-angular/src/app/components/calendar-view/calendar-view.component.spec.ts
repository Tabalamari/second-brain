import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CalendarViewComponent } from './calendar-view.component';
import { ScheduleStateService } from '../../services';

describe('CalendarViewComponent', () => {
  let component: CalendarViewComponent;
  let fixture: ComponentFixture<CalendarViewComponent>;
  let scheduleState: ScheduleStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarViewComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    scheduleState = TestBed.inject(ScheduleStateService);
    fixture = TestBed.createComponent(CalendarViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the calendar view component', () => {
    expect(component).toBeTruthy();
  });

  it('should start the weekday header row with Monday (Mon - Sun)', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const headers = Array.from(
      compiled.querySelectorAll('.calendar-weekdays-row span')
    ).map(el => el.textContent?.trim());

    expect(headers).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  });

  it('should generate 42 calendar cells where the first cell of every week is a Monday', () => {
    const cells = component.calendarCells();
    expect(cells.length).toBe(42);

    // Every first column in the 7-column grid (indices 0, 7, 14, 21, 28, 35) must be a Monday (getDay() === 1)
    for (let row = 0; row < 6; row++) {
      const firstCellInWeek = cells[row * 7];
      const dateObj = scheduleState.parseIsoDateLocal(firstCellInWeek.iso);
      expect(dateObj.getDay()).toBe(1);
    }
  });

  it('should update selectedDateIso when a calendar day is clicked', () => {
    component.selectDate('2026-04-20', false);
    expect(scheduleState.selectedDateIso()).toBe('2026-04-20');
  });
});

