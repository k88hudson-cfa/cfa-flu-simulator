<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

interface Item {
  id: string;
  label: string;
}

interface Group {
  label: string;
  items: Item[];
}

defineProps<{ groups: Group[] }>();

const activeId = ref<string>("");

let observer: IntersectionObserver | null = null;

onMounted(() => {
  const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-otp-id]"));
  if (!targets.length) return;
  observer = new IntersectionObserver(
    (entries) => {
      // Prefer whichever visible heading is closest to the top of the viewport.
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length) {
        activeId.value = (visible[0].target as HTMLElement).dataset.otpId ?? "";
      }
    },
    { rootMargin: "0px 0px -70% 0px", threshold: 0 },
  );
  for (const el of targets) observer.observe(el);
  activeId.value = targets[0].dataset.otpId ?? "";
});

onUnmounted(() => {
  observer?.disconnect();
});

function go(id: string, e: MouseEvent) {
  const el = document.querySelector<HTMLElement>(`[data-otp-id="${id}"]`);
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  activeId.value = id;
}
</script>

<template>
  <nav class="otp" aria-label="On this page">
    <h4 class="otp__title">On this page</h4>
    <div v-for="g in groups" :key="g.label" class="otp__group">
      <div v-if="g.label" class="otp__group-label">{{ g.label }}</div>
      <ul class="otp__list">
        <li v-for="item in g.items" :key="item.id">
          <a
            :href="`#${item.id}`"
            :class="['otp__link', { 'otp__link--active': activeId === item.id }]"
            @click="(e) => go(item.id, e)"
          >
            {{ item.label }}
          </a>
        </li>
      </ul>
    </div>
  </nav>
</template>

<style scoped>
.otp {
  position: sticky;
  top: 1rem;
  padding: 0.5rem 0 0.5rem 1rem;
  border-left: 1px solid rgba(128, 128, 128, 0.2);
  font-size: 0.875rem;
  min-width: 180px;
}
.otp__title {
  font-size: 0.875rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
}
.otp__group + .otp__group {
  margin-top: 1rem;
}
.otp__group-label {
  font-size: 0.8rem;
  opacity: 0.7;
  margin-bottom: 0.25rem;
}
.otp__list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.otp__link {
  display: block;
  padding: 0.25rem 0 0.25rem 0.75rem;
  margin-left: -1rem;
  border-left: 2px solid transparent;
  color: inherit;
  text-decoration: none;
  opacity: 0.7;
  transition: opacity 0.15s, color 0.15s, border-color 0.15s;
}
.otp__link:hover {
  opacity: 1;
}
.otp__link--active {
  opacity: 1;
  color: var(--accent);
  border-left-color: var(--accent);
  font-weight: 500;
}
</style>
