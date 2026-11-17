(() => {
  const localDate = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const today = () => localDate.format(new Date());
  const start = month => month ? month + '-01' : '';
  const end = (month, cutoff = today()) => {
    if (!month) return '';
    if (month >= cutoff.slice(0, 7)) return cutoff;
    const [year, number] = month.split('-').map(Number);
    return new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10);
  };
  function setRange(from, to, lastDate, reset = false) {
    const current = today().slice(0, 7);
    const previous = lastDate?.slice(0, 7) || current;
    for (const input of [from, to]) {
      input.max = current;
      if (reset || !input.value || input.value > current || (current !== previous && input.value === previous)) {
        input.value = current;
      }
    }
    if (from.value > to.value) from.value = to.value;
  }
  window.BodegaMonths = { today, start, end, setRange };
})();
