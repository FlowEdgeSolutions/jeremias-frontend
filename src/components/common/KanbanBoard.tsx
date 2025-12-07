import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface KanbanColumn<T> {
  id: string;
  title: string;
  items: T[];
}

interface KanbanBoardProps<T> {
  columns: KanbanColumn<T>[];
  renderCard: (item: T) => React.ReactNode;
  onCardClick?: (item: T) => void;
  onCardDrop?: (itemId: string, newColumnId: string) => void;
  getItemId: (item: T) => string;
}

interface SortableCardProps {
  id: string;
  children: React.ReactNode;
}

function SortableCard({ id, children }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

export function KanbanBoard<T>({
  columns,
  renderCard,
  onCardClick,
  onCardDrop,
  getItemId,
}: KanbanBoardProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !onCardDrop) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column (not on another card)
    const targetColumn = columns.find((col) => col.id === overId);
    if (targetColumn) {
      onCardDrop(activeId, targetColumn.id);
    } else {
      // Dropped on a card, find which column it belongs to
      for (const column of columns) {
        const item = column.items.find((item) => getItemId(item) === overId);
        if (item) {
          onCardDrop(activeId, column.id);
          break;
        }
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Find active item for DragOverlay
  const activeItem = activeId
    ? columns
        .flatMap((col) => col.items)
        .find((item) => getItemId(item) === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="w-full overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {columns.map((column) => {
            const itemIds = column.items.map(getItemId);

            return (
              <SortableContext
                key={column.id}
                id={column.id}
                items={itemIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col min-w-[280px] w-[280px]">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">{column.title}</h3>
                    <Badge variant="secondary">{column.items.length}</Badge>
                  </div>

                  <div className="space-y-3 flex-1 min-h-[200px]">
                    {column.items.map((item) => (
                      <SortableCard key={getItemId(item)} id={getItemId(item)}>
                        <div onClick={() => onCardClick?.(item)}>
                          {renderCard(item)}
                        </div>
                      </SortableCard>
                    ))}
                    {column.items.length === 0 && (
                      <div className="p-4 text-center text-sm text-muted-foreground border-2 border-dashed border-border rounded-lg">
                        Keine Einträge
                      </div>
                    )}
                  </div>
                </div>
              </SortableContext>
            );
          })}
        </div>
      </div>

      <DragOverlay>
        {activeItem ? (
          <div style={{ cursor: "grabbing", opacity: 0.8 }}>
            {renderCard(activeItem)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

