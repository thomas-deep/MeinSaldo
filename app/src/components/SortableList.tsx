"use client";

import { ReactNode } from "react";
import { GripVertical } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableItemProps {
  id: string | number;
  children: (handleProps: {
    attributes: Record<string, unknown>;
    listeners: Record<string, unknown>;
    setActivatorNodeRef: (el: HTMLElement | null) => void;
  }) => ReactNode;
}

function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? "relative" : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({
        attributes: attributes as unknown as Record<string, unknown>,
        listeners: (listeners ?? {}) as unknown as Record<string, unknown>,
        setActivatorNodeRef,
      })}
    </div>
  );
}

export function DragHandle({
  attributes,
  listeners,
  setActivatorNodeRef,
  title = "Ziehen zum Sortieren",
}: {
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown>;
  setActivatorNodeRef: (el: HTMLElement | null) => void;
  title?: string;
}) {
  return (
    <button
      ref={setActivatorNodeRef}
      type="button"
      {...(attributes as Record<string, string>)}
      {...(listeners as Record<string, unknown>)}
      title={title}
      className="flex h-7 w-5 items-center justify-center text-fg-faint hover:text-fg-muted cursor-grab active:cursor-grabbing touch-none"
      aria-label={title}
      onClick={(e) => e.stopPropagation()}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

interface SortableListProps<T extends { id: number | string }> {
  items: T[];
  onReorder: (newOrder: T[]) => void | Promise<void>;
  renderItem: (
    item: T,
    handle: {
      attributes: Record<string, unknown>;
      listeners: Record<string, unknown>;
      setActivatorNodeRef: (el: HTMLElement | null) => void;
    }
  ) => ReactNode;
}

export default function SortableList<T extends { id: number | string }>({
  items,
  onReorder,
  renderItem,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => String(i.id) === String(active.id));
    const newIndex = items.findIndex((i) => String(i.id) === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    void onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((item) => (
          <SortableItem key={item.id} id={item.id}>
            {(handle) => renderItem(item, handle)}
          </SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  );
}
