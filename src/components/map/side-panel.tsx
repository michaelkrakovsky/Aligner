"use client";

import { useState, type ReactNode } from "react";
import { GoogleDocIcon } from "@/components/google/google-doc-icon";
import { useGoogleDocs } from "@/components/google/google-docs-context";
import { LinkedDocs } from "./linked-docs";
import {
  addRole,
  removeEdge,
  removeRole,
  updateEdge,
  updateNode,
  type MapIssue,
} from "@/lib/map/operations";
import {
  LAYERS,
  LAYER_LABELS,
  NODE_STATUSES,
  NODE_TYPES,
  NODE_TYPE_LABELS,
  SEVERITIES,
  type MapEdge,
  type MapNode,
  type RealityMap,
} from "@/lib/map/schema";

type MapUpdater = (update: (map: RealityMap) => RealityMap) => void;

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-800";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
      {label}
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Issues({ issues }: { issues: MapIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1 rounded-md bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
      {issues.map((i, idx) => (
        <li key={idx}>! {i.message}</li>
      ))}
    </ul>
  );
}

const buttonClass =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800";
const dangerButtonClass =
  "rounded-md border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950";

export function NodePanel({
  map,
  node,
  issues,
  update,
  onAddStep,
  onAddVariation,
  onDelete,
}: {
  map: RealityMap;
  node: MapNode;
  issues: MapIssue[];
  update: MapUpdater;
  onAddStep: () => void;
  onAddVariation: () => void;
  onDelete: () => void;
}) {
  const patch = (p: Partial<Omit<MapNode, "id">>) =>
    update((m) => updateNode(m, node.id, p));

  return (
    <div className="flex flex-col gap-4" aria-label="Node details">
      <Field label="Title">
        <input
          className={inputClass}
          value={node.title}
          maxLength={120}
          onChange={(e) => patch({ title: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <select
            className={inputClass}
            value={node.type}
            onChange={(e) => patch({ type: e.target.value as MapNode["type"] })}
          >
            {NODE_TYPES.map((t) => (
              <option key={t} value={t}>
                {NODE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Layer">
          <select
            className={inputClass}
            value={node.layer}
            onChange={(e) => patch({ layer: e.target.value as MapNode["layer"] })}
          >
            {LAYERS.map((l) => (
              <option key={l} value={l}>
                {LAYER_LABELS[l]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Owner">
          <select
            className={inputClass}
            value={node.ownerRoleId ?? ""}
            onChange={(e) => patch({ ownerRoleId: e.target.value || null })}
          >
            <option value="">No owner</option>
            {map.roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            className={inputClass}
            value={node.status}
            onChange={(e) =>
              patch({ status: e.target.value as MapNode["status"] })
            }
          >
            {NODE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Description">
        <textarea
          className={`${inputClass} min-h-20`}
          value={node.description}
          maxLength={5000}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </Field>

      {node.type === "variation" && node.variation && (
        <Section title="Variation">
          <Field label="Trigger condition">
            <input
              className={inputClass}
              value={node.variation.trigger}
              placeholder="When does this path happen?"
              onChange={(e) =>
                patch({ variation: { ...node.variation!, trigger: e.target.value } })
              }
            />
          </Field>
          <Field label="Severity">
            <select
              className={inputClass}
              value={node.variation.severity}
              onChange={(e) =>
                patch({
                  variation: {
                    ...node.variation!,
                    severity: e.target.value as (typeof SEVERITIES)[number],
                  },
                })
              }
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="SOP link">
            <input
              className={inputClass}
              type="url"
              value={node.variation.sopUrl}
              placeholder="https://docs.google.com/..."
              onChange={(e) =>
                patch({ variation: { ...node.variation!, sopUrl: e.target.value } })
              }
            />
          </Field>
          {node.variation.sopUrl && /^https?:\/\//.test(node.variation.sopUrl) && (
            <a
              href={node.variation.sopUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-sky-700 underline dark:text-sky-300"
            >
              Open SOP
            </a>
          )}
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={node.variation.noSopYet}
              onChange={(e) =>
                patch({ variation: { ...node.variation!, noSopYet: e.target.checked } })
              }
            />
            No SOP yet
          </label>
        </Section>
      )}

      <LinkedDocs node={node} update={update} />

      <Issues issues={issues} />

      <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <button className={buttonClass} onClick={onAddStep}>
          Add step after
        </button>
        <button className={buttonClass} onClick={onAddVariation}>
          Add variation
        </button>
        <button className={dangerButtonClass} onClick={onDelete}>
          Delete node
        </button>
      </div>
    </div>
  );
}

export function EdgePanel({
  map,
  edge,
  update,
  onDeleted,
}: {
  map: RealityMap;
  edge: MapEdge;
  update: MapUpdater;
  onDeleted: () => void;
}) {
  const title = (id: string) =>
    map.nodes.find((n) => n.id === id)?.title || "Untitled";
  return (
    <div className="flex flex-col gap-4" aria-label="Connection details">
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        <span className="font-semibold">{title(edge.source)}</span> →{" "}
        <span className="font-semibold">{title(edge.target)}</span>
      </p>
      <Field label="Label or condition">
        <input
          className={inputClass}
          value={edge.label}
          maxLength={120}
          placeholder="e.g. complaint raised"
          onChange={(e) =>
            update((m) => updateEdge(m, edge.id, { label: e.target.value }))
          }
        />
      </Field>
      <div>
        <button
          className={dangerButtonClass}
          onClick={() => {
            update((m) => removeEdge(m, edge.id));
            onDeleted();
          }}
        >
          Delete connection
        </button>
      </div>
    </div>
  );
}

export function MapPanel({
  map,
  issues,
  update,
  onSelectNode,
}: {
  map: RealityMap;
  issues: MapIssue[];
  update: MapUpdater;
  onSelectNode: (id: string) => void;
}) {
  const [roleName, setRoleName] = useState("");
  const title = (id: string) =>
    map.nodes.find((n) => n.id === id)?.title || "Untitled";

  return (
    <div className="flex flex-col gap-4" aria-label="Map details">
      <Field label="Description">
        <textarea
          className={`${inputClass} min-h-20`}
          value={map.description}
          maxLength={5000}
          onChange={(e) =>
            update((m) => ({ ...m, description: e.target.value }))
          }
        />
      </Field>

      <GoogleConnection />

      <Section title="Roles">
        <ul className="flex flex-col gap-1">
          {map.roles.map((r) => {
            const owned = map.nodes.filter((n) => n.ownerRoleId === r.id).length;
            return (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 text-zinc-800 dark:text-zinc-200">{r.name}</span>
                <span className="text-xs text-zinc-500">
                  {owned} node{owned === 1 ? "" : "s"}
                </span>
                <button
                  aria-label={`Remove role ${r.name}`}
                  className="px-1 text-zinc-400 hover:text-rose-600"
                  onClick={() => update((m) => removeRole(m, r.id))}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!roleName.trim()) return;
            update((m) => addRole(m, roleName).map);
            setRoleName("");
          }}
        >
          <input
            className={inputClass}
            value={roleName}
            maxLength={80}
            placeholder="New role, e.g. Clinical"
            aria-label="New role name"
            onChange={(e) => setRoleName(e.target.value)}
          />
          <button type="submit" className={buttonClass}>
            Add
          </button>
        </form>
      </Section>

      <Section title={`Issues (${issues.length})`}>
        {issues.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Every node is owned, connected, and documented.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {issues.map((i, idx) => (
              <li key={idx}>
                <button
                  className="w-full rounded px-1 py-0.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => onSelectNode(i.nodeId)}
                >
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {title(i.nodeId)}
                  </span>
                  <span className="text-zinc-500">: {i.message}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

/** Shows whether Google Docs is connected, with a way to disconnect. */
function GoogleConnection() {
  const google = useGoogleDocs();
  const [busy, setBusy] = useState(false);
  if (!google?.available || !google.connected) return null;
  return (
    <Section title="Google Docs">
      <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <GoogleDocIcon size={16} />
        <span className="flex-1">Connected, read only for docs you pick</span>
        <button
          type="button"
          disabled={busy}
          className="text-xs font-medium text-zinc-500 hover:text-rose-600 disabled:opacity-50"
          onClick={async () => {
            setBusy(true);
            try {
              await google.disconnect();
            } finally {
              setBusy(false);
            }
          }}
        >
          Disconnect
        </button>
      </div>
    </Section>
  );
}
