'use client';

type Page = {
  id: string;
  parent_id: string | null;
  title: string;
  icon: string | null;
  position: number;
};

export function Sidebar({
  currentWorkspace,
  workspaces: _workspaces,
  pages,
  currentUser: _currentUser,
}: {
  currentWorkspace: { id: string; name: string };
  workspaces: { id: string; name: string }[];
  pages: Page[];
  currentUser: { id: string; email: string; name: string };
}) {
  return (
    <aside className="flex w-64 flex-col border-r bg-muted/30">
      <div className="border-b p-3">
        <div className="px-2 py-1.5 text-sm font-medium">{currentWorkspace.name}</div>
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pages</span>
      </div>
      <div className="flex-1 overflow-auto px-1">
        <ul className="py-1">
          {pages.map((p) => (
            <li key={p.id} className="rounded-md px-2 py-1 text-sm hover:bg-muted">
              {p.title || 'Untitled'}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
