import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { MemoryList } from '../src/ui/components/MemoryList';
import { MemoryDetail } from '../src/ui/components/MemoryDetail';
import { StatusBar } from '../src/ui/components/StatusBar';
import { HelpOverlay } from '../src/ui/components/HelpOverlay';

describe('Dashboard Components', () => {
  describe('StatusBar', () => {
    it('should render with connected status', () => {
      const { lastFrame } = render(
        <StatusBar
          mode="remote"
          memoryCount={100}
          userName="Test User"
          connectionStatus="connected"
          currentView="list"
        />
      );
      
      const frame = lastFrame();
      expect(frame).toContain('LZero');
      expect(frame).toContain('connected');
      expect(frame).toContain('100 memories');
      expect(frame).toContain('Test User');
    });

    it('should render with disconnected status', () => {
      const { lastFrame } = render(
        <StatusBar
          mode="local"
          memoryCount={0}
          connectionStatus="disconnected"
          currentView="search"
        />
      );
      
      const frame = lastFrame();
      expect(frame).toContain('disconnected');
      expect(frame).toContain('Local');
    });

    it('should render with connecting status', () => {
      const { lastFrame } = render(
        <StatusBar
          mode="remote"
          memoryCount={50}
          userName="Guest"
          connectionStatus="connecting"
          currentView="detail"
        />
      );
      
      const frame = lastFrame();
      expect(frame).toContain('connecting');
    });
  });

  describe('MemoryList', () => {
    const mockMemories = [
      {
        id: 'test-1',
        title: 'Test Memory 1',
        content: 'This is the content of test memory 1',
        memory_type: 'context',
        tags: ['test', 'memory'],
        similarity_score: 0.95,
      },
      {
        id: 'test-2',
        title: 'Test Memory 2',
        content: 'This is the content of test memory 2',
        memory_type: 'project',
        tags: ['project'],
        similarity_score: 0.85,
      },
    ];

    it('should render memory list', () => {
      const { lastFrame } = render(
        <MemoryList
          memories={mockMemories}
          selectedIndex={0}
          onSelect={() => {}}
          onSelectMemory={() => {}}
          view="list"
        />
      );
      
      const frame = lastFrame();
      expect(frame).toContain('Test Memory 1');
      expect(frame).toContain('Test Memory 2');
      expect(frame).toContain('(2 items)');
    });

    it('should show search results view', () => {
      const { lastFrame } = render(
        <MemoryList
          memories={mockMemories}
          selectedIndex={0}
          onSelect={() => {}}
          onSelectMemory={() => {}}
          view="search"
        />
      );
      
      const frame = lastFrame();
      expect(frame).toContain('Search Results');
      expect(frame).toContain('95%');
      expect(frame).toContain('85%');
    });

    it('should highlight selected memory', () => {
      const { lastFrame } = render(
        <MemoryList
          memories={mockMemories}
          selectedIndex={1}
          onSelect={() => {}}
          onSelectMemory={() => {}}
          view="list"
        />
      );
      
      const frame = lastFrame();
      expect(frame).toContain('▶');
    });

    it('should show empty state when no memories', () => {
      const { lastFrame } = render(
        <MemoryList
          memories={[]}
          selectedIndex={0}
          onSelect={() => {}}
          onSelectMemory={() => {}}
          view="list"
        />
      );
      
      const frame = lastFrame();
      expect(frame).toContain('No memories found');
    });

    it('should display tags', () => {
      const { lastFrame } = render(
        <MemoryList
          memories={mockMemories}
          selectedIndex={0}
          onSelect={() => {}}
          onSelectMemory={() => {}}
          view="list"
        />
      );
      
      const frame = lastFrame();
      expect(frame).toContain('#test');
      expect(frame).toContain('#memory');
    });
  });

  describe('MemoryDetail', () => {
    const mockMemory = {
      id: 'test-uuid-1234',
      title: 'Test Memory Detail',
      content: 'This is the full content of the memory. It can be quite long and detailed.',
      memory_type: 'knowledge',
      tags: ['important', 'reference'],
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-16T15:30:00Z',
    };

    it('should render memory details', () => {
      const { lastFrame } = render(
        <MemoryDetail
          memory={mockMemory}
          onBack={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      );
      
      const frame = lastFrame();
      expect(frame).toContain('Test Memory Detail');
      expect(frame).toContain('This is the full content');
      expect(frame).toContain('knowledge');
    });

    it('should show memory ID', () => {
      const { lastFrame } = render(
        <MemoryDetail
          memory={mockMemory}
          onBack={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      );
      
      const frame = lastFrame();
      expect(frame).toContain('ID: test-uui...');
    });

    it('should show tags', () => {
      const { lastFrame } = render(
        <MemoryDetail
          memory={mockMemory}
          onBack={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      );
      
      const frame = lastFrame();
      expect(frame).toContain('#important');
      expect(frame).toContain('#reference');
    });

    it('should show keyboard shortcuts', () => {
      const { lastFrame } = render(
        <MemoryDetail
          memory={mockMemory}
          onBack={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      );
      
      const frame = lastFrame();
      expect(frame).toContain('Back');
      expect(frame).toContain('Edit');
      expect(frame).toContain('Delete');
    });

    it('should trigger detail shortcuts from keyboard input', () => {
      const onBack = vi.fn();
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      const { stdin } = render(
        <MemoryDetail
          memory={mockMemory}
          onBack={onBack}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      stdin.write('e');
      stdin.write('d');
      stdin.write('q');

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('HelpOverlay', () => {
    it('should render help content', () => {
      const { lastFrame } = render(
        <HelpOverlay onClose={() => {}} />
      );
      
      const frame = lastFrame();
      expect(frame).toContain('Keyboard Shortcuts');
      expect(frame).toContain('Navigation');
      expect(frame).toContain('Actions');
    });

    it('should show navigation shortcuts', () => {
      const { lastFrame } = render(
        <HelpOverlay onClose={() => {}} />
      );
      
      const frame = lastFrame();
      expect(frame).toContain('↑/↓');
      expect(frame).toContain('Enter');
      expect(frame).toContain('ESC');
    });

    it('should show action shortcuts', () => {
      const { lastFrame } = render(
        <HelpOverlay onClose={() => {}} />
      );
      
      const frame = lastFrame();
      expect(frame).toContain('Create');
      expect(frame).toContain('Edit');
      expect(frame).toContain('Delete');
    });

    it('should show close instructions', () => {
      const { lastFrame } = render(
        <HelpOverlay onClose={() => {}} />
      );
      
      const frame = lastFrame();
      expect(frame).toContain('ESC');
      expect(frame).toContain('q');
      expect(frame).toContain('close');
    });

    it('should close on keyboard shortcuts', () => {
      const onClose = vi.fn();
      const { stdin } = render(
        <HelpOverlay onClose={onClose} />
      );

      stdin.write('q');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
