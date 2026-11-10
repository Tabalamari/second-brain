import { TestBed } from '@angular/core/testing';
import { STORAGE_KEY } from '../models';
import { ScheduleStateService } from './schedule-state.service';

describe('ScheduleStateService', () => {
  let service: ScheduleStateService;

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScheduleStateService);
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('should be created with default meetings and tasks', () => {
    expect(service).toBeTruthy();
    expect(service.meetings().length).toBeGreaterThan(0);
    expect(service.tasks().length).toBeGreaterThan(0);
  });

  describe('parseMinutesFromText', () => {
    it('should parse English and Ukrainian minute expressions', () => {
      expect(service.parseMinutesFromText('Write design doc 25min')).toBe(25);
      expect(service.parseMinutesFromText('Code review 45 хв')).toBe(45);
      expect(service.parseMinutesFromText('Quick sync 15 m')).toBe(15);
    });

    it('should parse English and Ukrainian hour expressions into minutes', () => {
      expect(service.parseMinutesFromText('Deep work 2 hours')).toBe(120);
      expect(service.parseMinutesFromText('Лекція 1 година')).toBe(60);
      expect(service.parseMinutesFromText('Workshop 3h')).toBe(180);
    });

    it('should return null when no duration is present', () => {
      expect(service.parseMinutesFromText('Read book chapter')).toBeNull();
      expect(service.parseMinutesFromText('')).toBeNull();
    });
  });

  describe('CRUD and completion operations', () => {
    it('should add a new task for a specific date', () => {
      const targetDate = '2026-05-10';
      const initialCount = service.tasks().length;

      service.addItem('task', 'Prepare slides', '30min', targetDate);

      expect(service.tasks().length).toBe(initialCount + 1);
      const added = service.tasks()[0];
      expect(added.text).toContain('Prepare slides');
      expect(added.durationMinutes).toBe(30);
      expect(added.date).toBe(targetDate);
      expect(added.completed).toBeFalse();
    });

    it('should toggle completion status of a task', () => {
      const firstTask = service.tasks()[0];
      const initialCompleted = firstTask.completed;

      service.toggleComplete(firstTask.id, 'task');
      const updatedTask = service.tasks().find(t => t.id === firstTask.id);
      expect(updatedTask?.completed).toBe(!initialCompleted);
    });

    it('should update and delete an item', () => {
      service.addItem('meeting', 'Team Standup', '10:00', '2026-05-12');
      const created = service.meetings()[0];

      service.updateItem(
        created.id,
        'meeting',
        'Product Sync',
        '11:30',
        '2026-05-12'
      );
      const updated = service.meetings().find(m => m.id === created.id);
      expect(updated?.text).toContain('Product Sync');
      expect(updated?.time).toBe('11:30');

      service.deleteItem(created.id, 'meeting');
      expect(service.meetings().find(m => m.id === created.id)).toBeUndefined();
    });

    it('should persist state to localStorage under SECOND_BRAIN_APP_STATE_V2', () => {
      service.addItem('task', 'Persisted Task', '20min', '2026-05-15');
      TestBed.flushEffects();

      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(
        parsed.tasks.some((t: { text: string }) =>
          t.text.includes('Persisted Task')
        )
      ).toBeTrue();
    });
  });
});

