<template>
  <main
    style="scroll-behavior: smooth; overflow: auto; height: 100vh"
    ref="rootRef"
  >
    <div v-for="item in data" :key="item.id" ref="itemsRef">
      {{ item.text }}
    </div>
  </main>
</template>

<script setup lang="ts">
import { scrollSmooth } from "@virtual-scrolled/core";
import { useIntersectionObserver } from "@virtual-scrolled/vue3";
import { onMounted, ref, shallowRef, watch } from "vue";
const getRandomData = (limit: number): any[] =>
  new Array(limit).fill(null).map((item, index) => ({
    id: index,
    text: new Array(1000 + Math.ceil(Math.random() * 1000)).fill("a").join(""),
  }));

const data = getRandomData(1000);
const itemsRef = ref([]);
const rootRef = shallowRef(null);
const [entries] = useIntersectionObserver(itemsRef);

onMounted(() => {
  watch(entries, () => {
    // console.log(entries.value);
  });
  // @ts-ignore
  window.target = rootRef.value;
  // @ts-ignore
  window.log = async () => {
    let consumedTime = 0;
    const start = Date.now();
    // 200ms内滚动至目标位置
    while (consumedTime < 1000) {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      // @ts-ignore
      console.log(`target.scrollTop: ${target.scrollTop}`);
      consumedTime = Date.now() - start;
    }
  };
  // @ts-ignore
  window.todo = async () => {
    const top = (rootRef.value.scrollTop += (0.5 - Math.random()) * 3000);
    // @ts-ignore
    await log();
    console.log(top);
  };
  // @ts-ignore
  window.scrollSmooth = async (
    top = rootRef.value.scrollTop + (0.5 - Math.random()) * 3000
  ) => {
    console.log("start scrollSmooth");
    // @ts-ignore
    log();
    // debugger;
    await scrollSmooth(rootRef.value, top);
    console.log("end scrollSmooth", rootRef.value.scrollTop);
    console.log({ top });
  };
});
</script>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
