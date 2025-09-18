const form = document.getElementById('planner-form');
const steps = Array.from(document.querySelectorAll('.form-step'));
const progressBar = document.querySelector('.progress__bar');
const report = document.getElementById('report');
const reportActions = document.querySelector('.report__actions');
const printButton = document.getElementById('print-report');
const resetButton = document.getElementById('reset-form');
const scrollButtons = document.querySelectorAll('[data-scroll]');
const skipProtectionButtons = document.querySelectorAll('[data-skip-protection]');

let currentStep = 0;

const formatCurrency = (value) =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

const formatPercent = (value) => `${Math.round(value * 100)}%`;

const parseNumber = (value) => {
  const number = parseFloat(value);
  return Number.isFinite(number) ? number : 0;
};

const escapeHTML = (value = '') =>
  value
    .toString()
    .replace(/[&<>'"]/g, (char) =>
      (
        {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;',
        }[char]
      ) || char,
    );

const updateProgress = () => {
  const progress = (currentStep / (steps.length - 1)) * 100;
  progressBar.style.width = `${progress}%`;
};

const showStep = (index) => {
  currentStep = Math.min(Math.max(index, 0), steps.length - 1);
  steps.forEach((step, idx) => {
    step.classList.toggle('active', idx === currentStep);
  });
  updateProgress();
  steps[currentStep].scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const validateStep = (stepIndex) => {
  const fields = steps[stepIndex].querySelectorAll('input, select, textarea');
  for (const field of fields) {
    if (!field.checkValidity()) {
      field.reportValidity();
      return false;
    }
  }
  return true;
};

const investmentLabel = (value) =>
  (
    {
      cash: 'Primarily cash or savings',
      balanced: 'Balanced allocation',
      growth: 'Growth-oriented portfolio',
    }[value]
  ) || 'Not specified';

const buildReport = (data) => {
  const formatYears = (value) => `${value} year${value === 1 ? '' : 's'}`;
  const incomes = [
    { label: 'Primary salary / wages', value: parseNumber(data.incomeSalary) },
    { label: 'Secondary income', value: parseNumber(data.incomeSecondary) },
    { label: 'Bonus or commissions', value: parseNumber(data.incomeBonus) },
    { label: 'Other recurring income', value: parseNumber(data.incomeOther) },
  ];
  const totalIncome = incomes.reduce((sum, item) => sum + item.value, 0);

  const expenses = [
    { label: 'Housing', value: parseNumber(data.expenseHousing) },
    { label: 'Transportation', value: parseNumber(data.expenseTransport) },
    { label: 'Groceries & dining', value: parseNumber(data.expenseFood) },
    { label: 'Insurance premiums', value: parseNumber(data.expenseInsurance) },
    { label: 'Debt payments', value: parseNumber(data.expenseDebt) },
    { label: 'Lifestyle & discretionary', value: parseNumber(data.expenseLifestyle) },
    { label: 'Education & childcare', value: parseNumber(data.expenseEducation) },
    { label: 'Healthcare', value: parseNumber(data.expenseHealth) },
  ];
  const totalExpenses = expenses.reduce((sum, item) => sum + item.value, 0);
  const monthlySavings = parseNumber(data.monthlySavings);
  const netCashFlow = totalIncome - totalExpenses;
  const surplusAfterSavings = netCashFlow - monthlySavings;
  const savingsRate = totalIncome ? monthlySavings / totalIncome : 0;
  const investmentPreference = data.currentInvestment || '';
  const assumedReturnRate =
    investmentPreference === 'growth'
      ? 0.08
      : investmentPreference === 'balanced'
      ? 0.05
      : 0;

  const investableBalance =
    parseNumber(data.assetCash) +
    parseNumber(data.assetInvestments) +
    parseNumber(data.assetRetirement) +
    parseNumber(data.assetOther);

  const age = parseNumber(data.age);
  const retirementAge = parseNumber(data.retirementAge);
  const yearsToRetirement =
    retirementAge && age ? retirementAge - age : null;
  const monthsToRetirement =
    yearsToRetirement !== null
      ? Math.max(Math.ceil(yearsToRetirement * 12), 0)
      : 0;

  const planningHorizonYears =
    yearsToRetirement !== null ? Math.max(Math.round(yearsToRetirement), 0) : null;
  const projectionHorizon = Math.max(
    yearsToRetirement !== null && yearsToRetirement > 0
      ? Math.ceil(yearsToRetirement)
      : 30,
    1,
  );

  const lifeExpectancyInput = parseNumber(data.lifeExpectancy);
  const defaultLifeExpectancy = 100;
  const effectiveLifeExpectancy =
    lifeExpectancyInput > 0
      ? lifeExpectancyInput
      : retirementAge > 0
      ? Math.max(retirementAge, defaultLifeExpectancy)
      : defaultLifeExpectancy;
  const retirementDurationYears =
    retirementAge > 0
      ? Math.max(effectiveLifeExpectancy - retirementAge, 0)
      : 0;
  const desiredRetirementIncome = parseNumber(data.retirementIncome);

  const recommendedReturnRate = Math.max(assumedReturnRate, 0.08);
  const conservativeReturnRate = 0.04;
  const retirementGrowthRate = Math.max(recommendedReturnRate, 0);
  const requiredNestEgg =
    desiredRetirementIncome > 0 && retirementDurationYears > 0
      ? retirementGrowthRate > 0
        ? desiredRetirementIncome *
          ((1 - Math.pow(1 + retirementGrowthRate, -retirementDurationYears)) /
            retirementGrowthRate)
        : desiredRetirementIncome * retirementDurationYears
      : desiredRetirementIncome > 0
      ? desiredRetirementIncome
      : 0;

  let recommendedMonthlySavings = 0;
  if (requiredNestEgg > 0 && monthsToRetirement > 0) {
    const recommendedMonthlyRate = Math.pow(1 + recommendedReturnRate, 1 / 12) - 1;
    const growthFactor = Math.pow(1 + recommendedMonthlyRate, monthsToRetirement);
    if (recommendedMonthlyRate > 0 && growthFactor > 1) {
      recommendedMonthlySavings =
        ((requiredNestEgg - investableBalance * growthFactor) * recommendedMonthlyRate) /
        (growthFactor - 1);
    } else {
      recommendedMonthlySavings =
        (requiredNestEgg - investableBalance) / monthsToRetirement;
    }
  }
  recommendedMonthlySavings = Number.isFinite(recommendedMonthlySavings)
    ? Math.max(0, recommendedMonthlySavings)
    : 0;

  const contributionYears =
    yearsToRetirement !== null && yearsToRetirement > 0
      ? yearsToRetirement
      : projectionHorizon;

  const buildProjectionSeries = (
    initialBalance,
    horizonYears,
    monthlyContribution,
    annualRate,
    contributionYearsOverride = contributionYears,
  ) => {
    const totalMonths = Math.max(Math.ceil(horizonYears * 12), 0);
    const contributionMonths = Math.max(
      Math.ceil(Math.min(contributionYearsOverride, horizonYears) * 12),
      0,
    );
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
    let balance = initialBalance;
    const series = [{ year: 0, balance }];
    for (let month = 0; month < totalMonths; month++) {
      balance = balance * (1 + monthlyRate);
      if (month < contributionMonths) {
        balance += monthlyContribution;
      }
      if ((month + 1) % 12 === 0) {
        series.push({ year: (month + 1) / 12, balance });
      }
    }
    return series;
  };

  const projectionYears = Array.from(
    { length: projectionHorizon + 1 },
    (_, index) => index,
  );

  const currentSeries = buildProjectionSeries(
    investableBalance,
    projectionHorizon,
    monthlySavings,
    assumedReturnRate,
    contributionYears,
  );

  const recommendedSeries = buildProjectionSeries(
    investableBalance,
    projectionHorizon,
    recommendedMonthlySavings,
    recommendedReturnRate,
    contributionYears,
  );

  const maxProjectionBalance = Math.max(
    0,
    ...currentSeries.map((point) => point.balance),
    ...recommendedSeries.map((point) => point.balance),
  );

  const chartWidth = 640;
  const chartHeight = 320;
  const chartPadding = { top: 20, right: 32, bottom: 48, left: 72 };

  const xScale = (year) =>
    chartPadding.left +
    (year / projectionHorizon) * (chartWidth - chartPadding.left - chartPadding.right);

  const yScale = (value) => {
    if (!maxProjectionBalance) {
      return chartHeight - chartPadding.bottom;
    }
    const usableHeight = chartHeight - chartPadding.top - chartPadding.bottom;
    return chartHeight - chartPadding.bottom - (value / maxProjectionBalance) * usableHeight;
  };

  const buildPath = (series) =>
    series
      .map((point, idx) => {
        const command = idx === 0 ? 'M' : 'L';
        return `${command}${xScale(point.year).toFixed(2)} ${yScale(point.balance).toFixed(2)}`;
      })
      .join(' ');

  const currentPath = buildPath(currentSeries);
  const recommendedPath = buildPath(recommendedSeries);
  const markerInterval = Math.max(1, Math.round(projectionHorizon / 6));
  const buildMarkers = (series) =>
    series
      .filter(
        (point, index) =>
          index === 0 ||
          index === series.length - 1 ||
          point.year % markerInterval === 0,
      )
      .map((point) => {
        const x = xScale(point.year);
        const y = yScale(point.balance);
        return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3" />`;
      })
      .join('');
  const currentMarkers = buildMarkers(currentSeries);
  const recommendedMarkers = buildMarkers(recommendedSeries);

  const xTickInterval = Math.max(1, Math.round(projectionHorizon / 5));
  const xTicks = projectionYears.filter((year) => year % xTickInterval === 0);

  const yTickCount = 4;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, index) =>
    (maxProjectionBalance / yTickCount) * index,
  );

  const finalCurrentBalance = currentSeries[currentSeries.length - 1]?.balance || 0;
  const finalRecommendedBalance = recommendedSeries[recommendedSeries.length - 1]?.balance || 0;
  const additionalGrowth = Math.max(finalRecommendedBalance - finalCurrentBalance, 0);

  const projectionChart =
    maxProjectionBalance > 0
      ? `<div class="projection-graph">
          <svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="Savings projections over time">
            <g class="projection-grid">
              ${yTicks
                .map((tick) => {
                  const y = yScale(tick);
                  return `<line x1="${chartPadding.left}" x2="${chartWidth - chartPadding.right}" y1="${y.toFixed(
                    2,
                  )}" y2="${y.toFixed(2)}" />`;
                })
                .join('')}
              ${xTicks
                .map((tick) => {
                  const x = xScale(tick);
                  return `<line y1="${chartPadding.top}" y2="${chartHeight - chartPadding.bottom}" x1="${x.toFixed(
                    2,
                  )}" x2="${x.toFixed(2)}" />`;
                })
                .join('')}
            </g>
            <line class="projection-axis" x1="${chartPadding.left}" y1="${chartHeight - chartPadding.bottom}" x2="${chartWidth - chartPadding.right}" y2="${chartHeight - chartPadding.bottom}" />
            <line class="projection-axis" x1="${chartPadding.left}" y1="${chartPadding.top}" x2="${chartPadding.left}" y2="${chartHeight - chartPadding.bottom}" />
            <path class="projection-line projection-line--current" d="${currentPath}" />
            <path class="projection-line projection-line--recommended" d="${recommendedPath}" />
            <g class="projection-markers projection-markers--current">
              ${currentMarkers}
            </g>
            <g class="projection-markers projection-markers--recommended">
              ${recommendedMarkers}
            </g>
            <g class="projection-labels projection-labels--x">
              ${xTicks
                .map((tick) => {
                  const x = xScale(tick);
                  return `<text x="${x.toFixed(2)}" y="${chartHeight - chartPadding.bottom + 24}" text-anchor="middle">Year ${tick}</text>`;
                })
                .join('')}
            </g>
            <g class="projection-labels projection-labels--y">
              ${yTicks
                .map((tick) => {
                  const y = yScale(tick);
                  return `<text x="${chartPadding.left - 12}" y="${(y + 6).toFixed(
                    2,
                  )}" text-anchor="end">${formatCurrency(tick)}</text>`;
                })
                .join('')}
            </g>
          </svg>
          <div class="projection-legend">
            <span class="legend-item"><span class="legend-swatch legend-swatch--current"></span>Current contributions (${formatCurrency(
              monthlySavings,
            )}/mo @ ${formatPercent(assumedReturnRate)})</span>
            <span class="legend-item"><span class="legend-swatch legend-swatch--recommended"></span>Recommended plan (${formatCurrency(
              recommendedMonthlySavings,
            )}/mo @ ${formatPercent(recommendedReturnRate)})</span>
          </div>
        </div>`
      : `<p class="projection-empty">Enter savings and asset details to preview long-term growth.</p>`;

  const projectionComparison =
    additionalGrowth > 0
      ? `Following the recommended path could build approximately ${formatCurrency(
          finalRecommendedBalance,
        )} in ${projectionHorizon} years — about ${formatCurrency(
          additionalGrowth,
        )} more than continuing with the current approach.`
      : `At the current settings, both paths are projected to reach about ${formatCurrency(
          finalCurrentBalance,
        )} in ${projectionHorizon} years.`;

  const yearsToRetirementExact =
    yearsToRetirement !== null ? Math.max(yearsToRetirement, 0) : null;
  const retirementYearsAway =
    yearsToRetirementExact !== null ? Math.max(Math.ceil(yearsToRetirementExact), 0) : null;
  const displayYearsToRetirement =
    yearsToRetirementExact !== null ? Math.max(Math.round(yearsToRetirementExact), 0) : null;
  const drawdownYears = Math.max(
    Math.ceil(Math.max(retirementDurationYears, 1)),
    1,
  );
  const retirementHorizonYears =
    retirementYearsAway !== null ? retirementYearsAway + drawdownYears : null;
  const canProjectRetirement =
    retirementYearsAway !== null &&
    retirementYearsAway > 0 &&
    retirementHorizonYears !== null &&
    retirementHorizonYears > retirementYearsAway &&
    requiredNestEgg > 0;

  let retirementTrajectory = null;
  let retirementStartYear = null;
  let balanceAtRetirement = 0;
  let retirementRunOutYear = null;

  if (canProjectRetirement) {
    const totalMonths = retirementHorizonYears * 12;
    const retirementStartMonth = Math.max(
      Math.ceil(yearsToRetirementExact * 12),
      0,
    );
    const monthlyWithdrawal = desiredRetirementIncome / 12;
    const accumulationMonthlyRate = Math.pow(1 + assumedReturnRate, 1 / 12) - 1;
    const drawdownMonthlyRate = Math.pow(1 + conservativeReturnRate, 1 / 12) - 1;
    let balance = investableBalance;
    let runOutMonth = null;
    retirementStartYear = retirementStartMonth / 12;
    retirementTrajectory = [{ year: 0, balance }];

    for (let month = 0; month < totalMonths; month++) {
      const inAccumulation = month < retirementStartMonth;
      const monthlyRate = inAccumulation ? accumulationMonthlyRate : drawdownMonthlyRate;
      balance = balance * (1 + monthlyRate);

      if (inAccumulation) {
        balance += monthlySavings;
      } else if (monthlyWithdrawal > 0) {
        balance -= monthlyWithdrawal;
      }

      if (inAccumulation && month + 1 === retirementStartMonth) {
        balanceAtRetirement = balance;
      }

      if (!inAccumulation && runOutMonth === null && balance <= 0) {
        runOutMonth = month + 1;
        balance = 0;
      } else if (!inAccumulation && balance < 0) {
        balance = 0;
      }

      if ((month + 1) % 12 === 0) {
        retirementTrajectory.push({ year: (month + 1) / 12, balance });
      }
    }

    if (!balanceAtRetirement) {
      const retirementPoint = retirementTrajectory.find(
        (point) => point.year >= retirementStartYear,
      );
      balanceAtRetirement = retirementPoint ? retirementPoint.balance : balance;
    }

    if (runOutMonth !== null) {
      retirementRunOutYear = runOutMonth / 12;
    }
  }

  const retirementChartMax = Math.max(
    0,
    requiredNestEgg,
    ...(retirementTrajectory?.map((point) => point.balance) || []),
  );

  const retirementChartWidth = 640;
  const retirementChartHeight = 320;
  const retirementPadding = { top: 20, right: 32, bottom: 48, left: 72 };

  const retirementXScale = (year) =>
    retirementPadding.left +
    (year / retirementHorizonYears) *
      (retirementChartWidth - retirementPadding.left - retirementPadding.right);

  const retirementYScale = (value) => {
    if (!retirementChartMax) {
      return retirementChartHeight - retirementPadding.bottom;
    }
    const usableHeight =
      retirementChartHeight - retirementPadding.top - retirementPadding.bottom;
    return (
      retirementChartHeight -
      retirementPadding.bottom -
      (value / retirementChartMax) * usableHeight
    );
  };

  const retirementTickInterval = canProjectRetirement
    ? Math.max(1, Math.round(retirementHorizonYears / 5))
    : 1;

  let retirementYearTicks = [];
  if (canProjectRetirement) {
    retirementYearTicks = Array.from(
      { length: retirementHorizonYears + 1 },
      (_, index) => index,
    ).filter((year) => year % retirementTickInterval === 0);

    if (
      retirementYearTicks[retirementYearTicks.length - 1] !== retirementHorizonYears
    ) {
      retirementYearTicks.push(retirementHorizonYears);
    }
  }

  const retirementYAxisSteps = 4;
  const retirementYAxisTicks = Array.from(
    { length: retirementYAxisSteps + 1 },
    (_, index) => (retirementChartMax / retirementYAxisSteps) * index,
  );

  const retirementBalancePath =
    retirementTrajectory
      ?.map((point, idx) => {
        const command = idx === 0 ? 'M' : 'L';
        return `${command}${retirementXScale(point.year).toFixed(2)} ${retirementYScale(
          point.balance,
        ).toFixed(2)}`;
      })
      .join('') || '';

  const retirementMarkerInterval = canProjectRetirement
    ? Math.max(1, Math.round(retirementHorizonYears / 6))
    : 1;
  const buildRetirementMarkers = (series) =>
    series
      ?.filter(
        (point, index, arr) =>
          index === 0 || index === arr.length - 1 || point.year % retirementMarkerInterval === 0,
      )
      .map((point) => {
        const x = retirementXScale(point.year);
        const y = retirementYScale(point.balance);
        return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3" />`;
      })
      .join('') || '';

  const retirementBalanceMarkers = buildRetirementMarkers(retirementTrajectory);

  const yearsIntoRetirementAtRunOut =
    retirementRunOutYear !== null && retirementStartYear !== null
      ? Math.max(retirementRunOutYear - retirementStartYear, 0)
      : null;
  const runOutAge =
    retirementRunOutYear !== null && age
      ? Math.round(age + retirementRunOutYear)
      : retirementRunOutYear !== null && retirementAge
      ? Math.round(retirementAge + Math.max(yearsIntoRetirementAtRunOut || 0, 0))
      : null;
  const yearsIntoRetirementDisplay =
    yearsIntoRetirementAtRunOut !== null
      ? Math.max(Math.round(yearsIntoRetirementAtRunOut), 0)
      : null;
  const yearsIntoRetirementText =
    yearsIntoRetirementAtRunOut !== null
      ? yearsIntoRetirementAtRunOut < 1
        ? '< 1'
        : `${Math.max(yearsIntoRetirementDisplay || 1, 1)}`
      : null;
  const yearsIntoRetirementDescription =
    yearsIntoRetirementText !== null
      ? yearsIntoRetirementText === '< 1'
        ? 'less than 1 year'
        : `${yearsIntoRetirementText} year${yearsIntoRetirementText === '1' ? '' : 's'}`
      : null;
  const targetRetirementYears =
    retirementDurationYears > 0 ? retirementDurationYears : drawdownYears;
  const longevityAge =
    retirementAge > 0 ? retirementAge + Math.max(retirementDurationYears, 0) : null;

  const retirementEventMarkers = canProjectRetirement
    ? (() => {
        const events = [];
        if (retirementStartYear !== null) {
          const x = retirementXScale(retirementStartYear);
          events.push(
            `<line class="projection-event-line" x1="${x.toFixed(2)}" x2="${x.toFixed(
              2,
            )}" y1="${retirementPadding.top}" y2="${
              retirementChartHeight - retirementPadding.bottom
            }" />`,
          );
          events.push(
            `<text class="projection-event-label" x="${x.toFixed(2)}" y="${
              retirementChartHeight - retirementPadding.bottom + 20
            }" text-anchor="middle">Retirement</text>`,
          );
        }
        if (retirementRunOutYear !== null) {
          const x = retirementXScale(
            Math.min(retirementRunOutYear, retirementHorizonYears),
          );
          const label = yearsIntoRetirementText !== null
            ? yearsIntoRetirementText === '< 1'
              ? 'Run out <1 yr in'
              : `Run out ${yearsIntoRetirementText} yr${
                  yearsIntoRetirementText === '1' ? '' : 's'
                } in`
            : 'Run out';
          events.push(
            `<line class="projection-event-line projection-event-line--warning" x1="${x.toFixed(
              2,
            )}" x2="${x.toFixed(2)}" y1="${retirementPadding.top}" y2="${
              retirementChartHeight - retirementPadding.bottom
            }" />`,
          );
          events.push(
            `<text class="projection-event-label projection-event-label--warning" x="${x.toFixed(
              2,
            )}" y="${retirementChartHeight - retirementPadding.bottom + 20}" text-anchor="middle">${label}</text>`,
          );
        }
        return events.join('');
      })()
    : '';

  const retirementGridHorizontal = retirementYAxisTicks
    .map((tick) => {
      const y = retirementYScale(tick);
      return `<line x1="${retirementPadding.left}" x2="${
        retirementChartWidth - retirementPadding.right
      }" y1="${y.toFixed(2)}" y2="${y.toFixed(2)}" />`;
    })
    .join('');

  const retirementGridVertical = retirementYearTicks
    .map((tick) => {
      const x = retirementXScale(tick);
      return `<line y1="${retirementPadding.top}" y2="${
        retirementChartHeight - retirementPadding.bottom
      }" x1="${x.toFixed(2)}" x2="${x.toFixed(2)}" />`;
    })
    .join('');

  const retirementXAxisLabels = retirementYearTicks
    .map((tick) => {
      const x = retirementXScale(tick);
      return `<text x="${x.toFixed(2)}" y="${
        retirementChartHeight - retirementPadding.bottom + 24
      }" text-anchor="middle">Year ${tick}</text>`;
    })
    .join('');

  const retirementYAxisLabels = retirementYAxisTicks
    .map((tick) => {
      const y = retirementYScale(tick);
      return `<text x="${retirementPadding.left - 12}" y="${(y + 6).toFixed(
        2,
      )}" text-anchor="end">${formatCurrency(tick)}</text>`;
    })
    .join('');

  const finalRetirementBalance =
    retirementTrajectory?.[retirementTrajectory.length - 1]?.balance || 0;
  const shortfallAtRetirement = Math.max(requiredNestEgg - balanceAtRetirement, 0);
  const coversLongevity =
    yearsIntoRetirementAtRunOut === null ||
    yearsIntoRetirementAtRunOut >= targetRetirementYears;

  const retirementStatusTag = canProjectRetirement
    ? shortfallAtRetirement > 0
      ? `<div class="tag tag--alert">Shortfall at retirement: ${formatCurrency(
          shortfallAtRetirement,
        )}</div>`
      : coversLongevity
      ? `<div class="tag tag--success">On pace — withdrawals funded through age ${
          longevityAge ? Math.round(longevityAge) : retirementAge + drawdownYears
        }</div>`
      : `<div class="tag tag--alert">Withdrawals exhaust savings around age ${
          runOutAge ?? Math.round(retirementAge + (yearsIntoRetirementAtRunOut || 0))
        }</div>`
    : '';

  const retirementReadinessCopy = canProjectRetirement
    ? shortfallAtRetirement > 0
      ? `Current contributions are projected to build ${formatCurrency(
          balanceAtRetirement,
        )} by age ${retirementAge}, leaving ${formatCurrency(
          shortfallAtRetirement,
        )} less than the ${formatCurrency(
          requiredNestEgg,
        )} estimated to fund ${formatCurrency(desiredRetirementIncome)} per year.`
      : coversLongevity
      ? `Projected savings of ${formatCurrency(
          balanceAtRetirement,
        )} at age ${retirementAge} support ${formatCurrency(
          desiredRetirementIncome,
        )} annually through age ${
          longevityAge ? Math.round(longevityAge) : retirementAge + drawdownYears
        }, leaving approximately ${formatCurrency(finalRetirementBalance)} remaining.`
      : `Projected savings meet the income goal at retirement, but drawing ${formatCurrency(
          desiredRetirementIncome,
        )} annually is estimated to deplete savings around age ${
          runOutAge ?? Math.round(retirementAge + (yearsIntoRetirementAtRunOut || 0))
        } (${yearsIntoRetirementDescription || '0 years'} into retirement). Increase savings or adjust withdrawals to extend coverage.`
    : yearsToRetirement !== null && yearsToRetirement <= 0
    ? 'Adjust the target retirement age to be greater than your current age to calculate readiness.'
    : 'Add your target retirement age and desired income to calculate readiness.';

  const retirementSummaryDetails = [];
  if (retirementAge) {
    retirementSummaryDetails.push(`Target age ${retirementAge}`);
  }
  if (yearsToRetirement !== null) {
    retirementSummaryDetails.push(
      yearsToRetirement > 0
        ? `${displayYearsToRetirement} years away`
        : 'Retirement timing has already arrived',
    );
  }
  if (desiredRetirementIncome > 0) {
    retirementSummaryDetails.push(
      `Income goal ${formatCurrency(desiredRetirementIncome)}/yr`,
    );
  }
  if (balanceAtRetirement > 0) {
    retirementSummaryDetails.push(
      `Projected balance ${formatCurrency(balanceAtRetirement)}`,
    );
  }
  if (requiredNestEgg > 0) {
    retirementSummaryDetails.push(`Estimated need ${formatCurrency(requiredNestEgg)}`);
  }
  const retirementSummaryLine = retirementSummaryDetails.length
    ? retirementSummaryDetails.join(' • ')
    : 'Retirement goal details pending';

  const retirementChart =
    canProjectRetirement && retirementChartMax > 0
      ? `<div class="projection-graph">
          <svg viewBox="0 0 ${retirementChartWidth} ${retirementChartHeight}" role="img" aria-label="Retirement readiness projection">
            <g class="projection-grid">
              ${retirementGridHorizontal}${retirementGridVertical}
            </g>
            <line class="projection-axis" x1="${retirementPadding.left}" y1="${
          retirementChartHeight - retirementPadding.bottom
        }" x2="${retirementChartWidth - retirementPadding.right}" y2="${
          retirementChartHeight - retirementPadding.bottom
        }" />
            <line class="projection-axis" x1="${retirementPadding.left}" y1="${retirementPadding.top}" x2="${retirementPadding.left}" y2="${
          retirementChartHeight - retirementPadding.bottom
        }" />
            <path class="projection-line projection-line--current" d="${retirementBalancePath}" />
            <g class="projection-markers projection-markers--current">
              ${retirementBalanceMarkers}
            </g>
            <g class="projection-events">
              ${retirementEventMarkers}
            </g>
            <g class="projection-labels projection-labels--x">
              ${retirementXAxisLabels}
            </g>
            <g class="projection-labels projection-labels--y">
              ${retirementYAxisLabels}
            </g>
          </svg>
          <div class="projection-legend">
            <span class="legend-item"><span class="legend-swatch legend-swatch--current"></span>Account value (contributions until retirement, then ${formatCurrency(
              desiredRetirementIncome,
            )}/yr withdrawals @ ${formatPercent(conservativeReturnRate)})</span>
          </div>
        </div>`
      : `<p class="projection-empty">Add retirement timing and income goals to see projected drawdown.</p>`;

  const savingsGap = recommendedMonthlySavings - monthlySavings;
  const recommendationCopy =
    recommendedMonthlySavings > 0 && savingsGap > 1
      ? `Saving ${formatCurrency(
          recommendedMonthlySavings,
        )} per month at an expected ${formatPercent(
          recommendedReturnRate,
        )} return keeps the plan on pace to meet your retirement income target.`
      : recommendedMonthlySavings > 0
      ? `Current monthly savings of ${formatCurrency(
          monthlySavings,
        )} already meet the estimated need of ${formatCurrency(
          recommendedMonthlySavings,
        )} per month assuming ${formatPercent(
          recommendedReturnRate,
        )} growth.`
      : requiredNestEgg > 0
      ? 'Existing assets appear sufficient to support the stated retirement income goal without additional monthly contributions.'
      : 'Add monthly savings to begin compounding progress toward your goals.';

  const assets = [
    { label: 'Cash & emergency savings', value: parseNumber(data.assetCash) },
    { label: 'Taxable investments', value: parseNumber(data.assetInvestments) },
    { label: 'Retirement accounts', value: parseNumber(data.assetRetirement) },
    { label: 'Real estate equity', value: parseNumber(data.assetRealEstate) },
    { label: 'Business & other assets', value: parseNumber(data.assetOther) },
  ];
  const totalAssets = assets.reduce((sum, item) => sum + item.value, 0);

  const liabilities = [
    { label: 'Mortgage balance', value: parseNumber(data.debtMortgage) },
    { label: 'Student loans', value: parseNumber(data.debtStudent) },
    { label: 'Credit cards & personal loans', value: parseNumber(data.debtCredit) },
    { label: 'Other liabilities', value: parseNumber(data.debtOther) },
  ];
  const totalLiabilities = liabilities.reduce((sum, item) => sum + item.value, 0);
  const netWorth = totalAssets - totalLiabilities;

  const emergencyTargetMonths = parseNumber(data.emergencyTarget) || 6;
  const emergencyCoverage = totalExpenses
    ? parseNumber(data.assetCash) / totalExpenses
    : 0;

  const recommendations = [];

  if (netCashFlow <= 0) {
    recommendations.push(
      'Cash flow is negative—review discretionary spending and look for opportunities to trim expenses within the next 30 days.',
    );
  } else if (surplusAfterSavings < 0) {
    recommendations.push(
      'Spending and savings exceed income. Rebalance monthly savings targets or reduce expenses to avoid funding goals with debt.',
    );
  } else if (surplusAfterSavings < totalIncome * 0.05) {
    recommendations.push(
      'Surplus after savings is narrow. Consider automating a “first 5%” increase to savings to grow the buffer.',
    );
  }

  if (savingsRate < 0.15) {
    recommendations.push(
      'Increase monthly savings to at least 15% of income to stay on track for medium- and long-term goals.',
    );
  }

  if (emergencyCoverage < emergencyTargetMonths) {
    const gap = Math.max(emergencyTargetMonths - emergencyCoverage, 0).toFixed(1);
    recommendations.push(
      `Boost emergency reserves by approximately ${formatCurrency(
        Math.max(totalExpenses * emergencyTargetMonths - parseNumber(data.assetCash), 0),
      )} to cover an additional ${gap} months of essential expenses.`,
    );
  }

  if (yearsToRetirement !== null) {
    if (yearsToRetirement < 0) {
      recommendations.push(
        'Retirement age entered is below current age. Review assumptions for the retirement timeline.',
      );
    } else if (yearsToRetirement < 15 && savingsRate < 0.2) {
      recommendations.push(
        'With retirement approaching, push savings above 20% and review investment mix for income generation.',
      );
    }
  }

  if (parseNumber(data.debtCredit) > totalIncome * 2) {
    recommendations.push(
      'Elevated revolving debt detected. Explore consolidation or accelerated payoff strategies.',
    );
  }

  if (data.riskTolerance === 'conservative') {
    recommendations.push(
      'Keep portfolios diversified with an emphasis on capital preservation while layering guaranteed income sources.',
    );
  }

  if (data.estatePlanning === 'notyet') {
    recommendations.push(
      'Initiate estate planning to establish wills, powers of attorney, and beneficiary reviews.',
    );
  }

  if (!recommendations.length) {
    recommendations.push(
      'Financial foundation appears strong. Continue monitoring cash flow quarterly and revisit goals annually.',
    );
  }

  const goalHighlights = [
    data.shortTermGoals && `Next 12-36 months: ${escapeHTML(data.shortTermGoals)}`,
    data.longTermGoals && `7+ year priorities: ${escapeHTML(data.longTermGoals)}`,
    data.impactGoals && `Impact focus: ${escapeHTML(data.impactGoals)}`,
  ].filter(Boolean);

  const planningNotes = [
    data.concerns && `Key concerns: ${escapeHTML(data.concerns)}`,
    data.lifeEvents && `Upcoming milestones: ${escapeHTML(data.lifeEvents)}`,
    data.profileNotes && `Advisor insights: ${escapeHTML(data.profileNotes)}`,
  ].filter(Boolean);

  const today = new Date();
  const preparedDate = today.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
    <div class="report__header">
      <h2>${escapeHTML(data.fullName || 'Financial Plan')}</h2>
      <p>Prepared ${preparedDate} • Household status: ${escapeHTML(
        data.householdStatus || 'Not provided',
      )}</p>
      <div class="metrics">
        <div class="metric">
          <span>Total monthly income</span>
          <strong>${formatCurrency(totalIncome)}</strong>
        </div>
        <div class="metric">
          <span>Monthly commitments</span>
          <strong>${formatCurrency(totalExpenses + monthlySavings)}</strong>
        </div>
        <div class="metric">
          <span>Current savings rate</span>
          <strong>${formatPercent(savingsRate)}</strong>
        </div>
        <div class="metric">
          <span>Net worth</span>
          <strong>${formatCurrency(netWorth)}</strong>
        </div>
      </div>
    </div>
    <div class="report__grid">
      <article class="card">
        <h3>Savings outlook</h3>
        <p>
          Current investment mix: <strong>${escapeHTML(
            investmentLabel(investmentPreference),
          )}</strong>
        </p>
        <p>${recommendationCopy}</p>
        <p>${projectionComparison}</p>
        ${projectionChart}
      </article>
      <article class="card">
        <h3>Retirement readiness</h3>
        <p>${retirementSummaryLine}</p>
        ${retirementStatusTag}
        <p>${retirementReadinessCopy}</p>
        ${retirementChart}
      </article>
      <article class="card card--collapsible is-collapsed">
        <div class="card__header">
          <h3>Cash flow pulse</h3>
          <button
            type="button"
            class="card__toggle"
            data-section-label="cash flow"
            aria-expanded="false"
          >
            <span class="sr-only">Expand cash flow details</span>
            <span aria-hidden="true" class="card__toggle-icon"></span>
          </button>
        </div>
        <div class="card__content">
          <ul class="data-list">
            ${incomes
              .map(
                (item) => `
                  <li>
                    <strong>${formatCurrency(item.value)}</strong>
                    <span>${item.label}</span>
                  </li>
                `,
              )
              .join('')}
          </ul>
          <div class="tag">Net cash flow: ${formatCurrency(netCashFlow)}</div>
          <p>
            After current savings contributions of ${formatCurrency(
              monthlySavings,
            )}, surplus remaining each month is ${formatCurrency(surplusAfterSavings)}.
          </p>
        </div>
      </article>

      <article class="card card--collapsible is-collapsed">
        <div class="card__header">
          <h3>Essential expenses</h3>
          <button
            type="button"
            class="card__toggle"
            data-section-label="essential expenses"
            aria-expanded="false"
          >
            <span class="sr-only">Expand essential expenses details</span>
            <span aria-hidden="true" class="card__toggle-icon"></span>
          </button>
        </div>
        <div class="card__content">
          <ul class="data-list">
            ${expenses
              .map(
                (item) => `
                  <li>
                    <strong>${formatCurrency(item.value)}</strong>
                    <span>${item.label}</span>
                  </li>
                `,
              )
              .join('')}
          </ul>
          <p>Total monthly lifestyle spending: ${formatCurrency(totalExpenses)}</p>
        </div>
      </article>

      <article class="card card--collapsible is-collapsed">
        <div class="card__header">
          <h3>Balance sheet</h3>
          <button
            type="button"
            class="card__toggle"
            data-section-label="balance sheet"
            aria-expanded="false"
          >
            <span class="sr-only">Expand balance sheet details</span>
            <span aria-hidden="true" class="card__toggle-icon"></span>
          </button>
        </div>
        <div class="card__content">
          <p>
            Assets total ${formatCurrency(totalAssets)} versus liabilities of ${formatCurrency(
      totalLiabilities,
    )}, yielding a net worth of ${formatCurrency(netWorth)}.
          </p>
          <ul class="data-list">
            ${assets
              .map(
                (item) => `
                  <li>
                    <strong>${formatCurrency(item.value)}</strong>
                    <span>${item.label}</span>
                  </li>
                `,
              )
              .join('')}
          </ul>
          <hr />
          <ul class="data-list">
            ${liabilities
              .map(
                (item) => `
                  <li>
                    <strong>${formatCurrency(item.value)}</strong>
                    <span>${item.label}</span>
                  </li>
                `,
              )
              .join('')}
          </ul>
          <p>
            Emergency reserves cover ${emergencyCoverage.toFixed(1)} months versus a target of ${emergencyTargetMonths} months.
          </p>
        </div>
      </article>

      <article class="card">
        <h3>Goal tracker</h3>
        ${goalHighlights.length
          ? `<ul class="data-list">${goalHighlights
              .map((goal) => `<li>${goal}</li>`)
              .join('')}</ul>`
          : '<p>No goals captured yet. Use this space to align on what matters most.</p>'}
        ${
          yearsToRetirement !== null
            ? `<p>Retirement horizon: ${
                displayYearsToRetirement ?? yearsToRetirement
              } years • Desired income: ${formatCurrency(
                desiredRetirementIncome,
              )}</p>`
            : desiredRetirementIncome > 0
            ? `<p>Desired retirement income: ${formatCurrency(
                desiredRetirementIncome,
              )}</p>`
            : ''
        }
        <p>Risk comfort: <strong>${escapeHTML(data.riskTolerance || 'Not captured')}</strong></p>
        <p>Investment posture: <strong>${escapeHTML(
          investmentLabel(investmentPreference),
        )}</strong></p>
        <p>Longevity planning age: ${Math.round(effectiveLifeExpectancy)}</p>
        <p>
          Planning horizon focus:
          ${
            planningHorizonYears !== null
              ? planningHorizonYears > 0
                ? formatYears(planningHorizonYears)
                : 'At retirement'
              : 'Set a target retirement age to calculate'
          }
        </p>
      </article>

      <article class="card card--collapsible is-collapsed">
        <div class="card__header">
          <h3>Protection review</h3>
          <button
            type="button"
            class="card__toggle"
            data-section-label="protection"
            aria-expanded="false"
          >
            <span class="sr-only">Expand protection details</span>
            <span aria-hidden="true" class="card__toggle-icon"></span>
          </button>
        </div>
        <div class="card__content">
          <ul class="data-list">
            <li>
              <strong>${formatCurrency(parseNumber(data.lifeInsurance))}</strong>
              <span>Life insurance coverage</span>
            </li>
            <li>
              <strong>${formatCurrency(parseNumber(data.disabilityInsurance))}</strong>
              <span>Monthly disability benefit</span>
            </li>
            <li>
              <strong>${escapeHTML(data.estatePlanning || 'No update')}</strong>
              <span>Estate planning status</span>
            </li>
          </ul>
          ${planningNotes.length
            ? `<p>${planningNotes.join(' • ')}</p>`
            : '<p>No additional risk notes captured.</p>'}
        </div>
      </article>

      <article class="card">
        <h3>Immediate next steps</h3>
        <ol>
          ${recommendations.map((item) => `<li>${item}</li>`).join('')}
        </ol>
        <p>
          Revisit this plan quarterly to capture life changes and update projections. Sharing this summary with your advisor will ensure ongoing accountability.
        </p>
      </article>
    </div>
  `;
};

const initializeReportInteractions = () => {
  const collapsibleCards = report.querySelectorAll('.card--collapsible');
  collapsibleCards.forEach((card) => {
    const toggle = card.querySelector('.card__toggle');
    if (!toggle) return;

    const srOnly = toggle.querySelector('.sr-only');
    const sectionLabel = toggle.getAttribute('data-section-label') || 'section';

    const updateState = () => {
      const isCollapsed = card.classList.contains('is-collapsed');
      toggle.setAttribute('aria-expanded', (!isCollapsed).toString());
      if (srOnly) {
        srOnly.textContent = `${isCollapsed ? 'Expand' : 'Collapse'} ${sectionLabel} details`;
      }
    };

    toggle.addEventListener('click', () => {
      card.classList.toggle('is-collapsed');
      updateState();
    });

    updateState();
  });
};

const generatePlan = () => {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  report.innerHTML = buildReport(data);
  initializeReportInteractions();
  reportActions.hidden = false;
  report.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

steps.forEach((step) => {
  step.querySelectorAll('[data-next]').forEach((button) => {
    button.addEventListener('click', () => {
      if (validateStep(currentStep)) {
        showStep(currentStep + 1);
      }
    });
  });

  step.querySelectorAll('[data-prev]').forEach((button) => {
    button.addEventListener('click', () => {
      showStep(currentStep - 1);
    });
  });
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!validateStep(currentStep)) return;
  generatePlan();
});

skipProtectionButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (!validateStep(currentStep)) return;
    generatePlan();
  });
});

printButton?.addEventListener('click', () => {
  window.print();
});

resetButton?.addEventListener('click', () => {
  form.reset();
  showStep(0);
  report.innerHTML = `
    <div class="report__placeholder">
      <h3>Financial plan preview</h3>
      <p>
        Complete the discovery to reveal a personalized plan including cash flow insights, balance sheet, retirement readiness, and action items.
      </p>
    </div>
  `;
  reportActions.hidden = true;
});

scrollButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const targetSelector = button.getAttribute('data-scroll');
    const target = targetSelector === 'body' ? document.body : document.querySelector(targetSelector);
    target?.scrollIntoView({ behavior: 'smooth' });
  });
});

showStep(0);
