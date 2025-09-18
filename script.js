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
  const inheritancePreference = data.inheritancePreference || '';
  const wantsInheritance = inheritancePreference === 'yes';
  const desiredInheritanceAmount = parseNumber(data.inheritanceAmount);
  const assumedReturnRate =
    investmentPreference === 'growth'
      ? 0.08
      : investmentPreference === 'balanced'
      ? 0.05
      : 0;

  const investableBalance =
    parseNumber(data.assetInvestments) + parseNumber(data.assetRetirement);

  const age = parseNumber(data.age);
  const retirementAge = parseNumber(data.retirementAge);
  const yearsToRetirement =
    retirementAge && age ? retirementAge - age : null;
  const baseAge = age > 0 ? age : 0;
  const ageTarget = 100;
  const yearsUntilAgeTarget = Math.max(ageTarget - baseAge, 0);
  const projectionHorizon = Math.max(Math.ceil(yearsUntilAgeTarget), 1);
  const monthsToRetirement =
    yearsToRetirement !== null
      ? Math.max(Math.ceil(Math.max(yearsToRetirement, 0) * 12), 0)
      : 0;

  const planningHorizonYears =
    yearsToRetirement !== null ? Math.max(Math.round(yearsToRetirement), 0) : null;

  const lifeExpectancyInput = parseNumber(data.lifeExpectancy);
  const defaultLifeExpectancy = 100;
  const effectiveLifeExpectancy =
    lifeExpectancyInput > 0
      ? Math.max(lifeExpectancyInput, defaultLifeExpectancy)
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
  const monthlyRetirementWithdrawal = desiredRetirementIncome / 12;
  const retirementMonths = Math.max(Math.round(retirementDurationYears * 12), 0);
  const conservativeMonthlyRate = Math.pow(1 + conservativeReturnRate, 1 / 12) - 1;

  let requiredNestEgg = 0;
  if (desiredRetirementIncome > 0) {
    if (retirementMonths > 0) {
      requiredNestEgg =
        conservativeMonthlyRate > 0
          ? monthlyRetirementWithdrawal *
            ((1 - Math.pow(1 + conservativeMonthlyRate, -retirementMonths)) /
              conservativeMonthlyRate)
          : monthlyRetirementWithdrawal * retirementMonths;
    } else {
      requiredNestEgg =
        conservativeReturnRate > 0
          ? desiredRetirementIncome / conservativeReturnRate
          : desiredRetirementIncome;
    }
  }

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

  const savingsGap = recommendedMonthlySavings - monthlySavings;

  const contributionYears =
    yearsToRetirement !== null
      ? Math.max(yearsToRetirement, 0)
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
  if (xTicks[xTicks.length - 1] !== projectionHorizon) {
    xTicks.push(projectionHorizon);
  }

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
                  const ageLabel = Math.round(baseAge + tick);
                  return `<text x="${x.toFixed(2)}" y="${chartHeight - chartPadding.bottom + 24}" text-anchor="middle">Age ${ageLabel}</text>`;
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

  const horizonAgeLabel = Math.round(baseAge + projectionHorizon);
  const projectionComparison =
    additionalGrowth > 0
      ? `Following the recommended path could build approximately ${formatCurrency(
          finalRecommendedBalance,
        )} by age ${horizonAgeLabel} — about ${formatCurrency(
          additionalGrowth,
        )} more than continuing with the current approach.`
      : `At the current settings, both paths are projected to reach about ${formatCurrency(
          finalCurrentBalance,
        )} by age ${horizonAgeLabel}.`;

  const yearsToRetirementExact =
    yearsToRetirement !== null ? Math.max(yearsToRetirement, 0) : null;
  const retirementYearsAway =
    yearsToRetirementExact !== null ? Math.ceil(yearsToRetirementExact) : null;
  const displayYearsToRetirement =
    yearsToRetirement !== null && yearsToRetirement > 0
      ? Math.round(yearsToRetirement)
      : yearsToRetirement !== null
      ? 0
      : null;
  const drawdownYears = Math.max(
    Math.ceil(Math.max(retirementDurationYears, 1)),
    1,
  );
  const targetRetirementYears =
    retirementDurationYears > 0 ? retirementDurationYears : drawdownYears;
  const longevityAge =
    retirementAge > 0 ? retirementAge + Math.max(retirementDurationYears, 0) : null;

  const totalPlanYears =
    yearsToRetirementExact !== null
      ? yearsToRetirementExact + Math.max(retirementDurationYears, 0)
      : 0;
  const retirementChartYears = projectionHorizon;
  const retirementSimulationYears = Math.max(totalPlanYears, retirementChartYears);
  const canProjectRetirement =
    retirementAge > 0 &&
    age > 0 &&
    retirementSimulationYears > 0 &&
    requiredNestEgg > 0;

  const simulateRetirementPlan = (monthlyContribution, accumulationAnnualRate) => {
    if (!canProjectRetirement) {
      return null;
    }
    const accumulationMonthlyRate =
      Math.pow(1 + Math.max(accumulationAnnualRate, 0), 1 / 12) - 1;
    const totalMonths = Math.max(Math.round(retirementSimulationYears * 12), 0);
    const retirementStartMonth =
      yearsToRetirementExact !== null
        ? Math.max(Math.ceil(yearsToRetirementExact * 12), 0)
        : null;

    let balance = investableBalance;
    const trajectory = [{ year: 0, balance, age: baseAge }];
    let balanceAtRetirement =
      retirementStartMonth === 0 ? balance : null;
    let runOutMonth = null;

    if (totalMonths === 0) {
      return {
        trajectory,
        chartTrajectory: trajectory,
        retirementStartYear:
          retirementStartMonth !== null ? retirementStartMonth / 12 : null,
        balanceAtRetirement: balance,
        runOutYear: null,
        finalBalance: balance,
        inheritanceBalanceAt100: balance,
      };
    }

    for (let month = 0; month < totalMonths; month++) {
      const inDrawdown =
        retirementStartMonth !== null ? month >= retirementStartMonth : false;
      const monthlyRate = inDrawdown
        ? conservativeMonthlyRate
        : accumulationMonthlyRate;
      balance = balance * (1 + monthlyRate);

      if (!inDrawdown) {
        balance += monthlyContribution;
      } else if (monthlyRetirementWithdrawal > 0) {
        balance -= monthlyRetirementWithdrawal;
      }

      if (
        !inDrawdown &&
        retirementStartMonth !== null &&
        month + 1 === retirementStartMonth
      ) {
        balanceAtRetirement = balance;
      }

      if (inDrawdown && runOutMonth === null && balance <= 0) {
        runOutMonth = month + 1;
        balance = 0;
      } else if (inDrawdown && balance < 0) {
        balance = 0;
      }

      if ((month + 1) % 12 === 0 || month === totalMonths - 1) {
        const year = (month + 1) / 12;
        const ageAtPoint = baseAge + year;
        trajectory.push({ year, balance, age: ageAtPoint });
      }
    }

    const retirementStartYear =
      retirementStartMonth !== null ? retirementStartMonth / 12 : null;

    if (balanceAtRetirement === null && retirementStartYear !== null) {
      const retirementPoint = trajectory.find((point) => point.year >= retirementStartYear);
      balanceAtRetirement = retirementPoint
        ? retirementPoint.balance
        : trajectory[trajectory.length - 1]?.balance ?? balance;
    } else if (balanceAtRetirement === null) {
      balanceAtRetirement = trajectory[trajectory.length - 1]?.balance ?? balance;
    }

    const runOutYear = runOutMonth !== null ? runOutMonth / 12 : null;
    const finalBalance = trajectory[trajectory.length - 1]?.balance ?? balance;
    const targetPoint =
      trajectory.find((point) => point.year >= yearsUntilAgeTarget) ??
      trajectory[trajectory.length - 1];
    const inheritanceBalanceAt100 = Math.max(targetPoint?.balance ?? 0, 0);
    const chartTrajectory = trajectory.filter(
      (point) => point.year <= retirementChartYears + 1e-6,
    );

    return {
      trajectory,
      chartTrajectory,
      retirementStartYear,
      balanceAtRetirement,
      runOutYear,
      finalBalance,
      inheritanceBalanceAt100,
    };
  };

  const analyzeRetirementPlan = (plan) => {
    if (!plan) return null;

    const { retirementStartYear, runOutYear } = plan;
    const yearsIntoRetirementAtRunOut =
      runOutYear !== null && retirementStartYear !== null
        ? Math.max(runOutYear - retirementStartYear, 0)
        : null;
    const yearsIntoRetirementText =
      yearsIntoRetirementAtRunOut !== null
        ? yearsIntoRetirementAtRunOut < 1
          ? '< 1'
          : `${Math.round(yearsIntoRetirementAtRunOut)}`
        : null;
    const yearsIntoRetirementDescription =
      yearsIntoRetirementText !== null
        ? yearsIntoRetirementText === '< 1'
          ? 'less than 1 year'
          : `${yearsIntoRetirementText} year${yearsIntoRetirementText === '1' ? '' : 's'}`
        : null;
    const runOutAge =
      runOutYear !== null ? Math.round(baseAge + runOutYear) : null;
    const retirementStartAge =
      retirementStartYear !== null
        ? Math.round(baseAge + retirementStartYear)
        : retirementAge || null;
    const shortfallAtRetirement = Math.max(
      requiredNestEgg - plan.balanceAtRetirement,
      0,
    );
    const safeWithdrawalIncome = plan.balanceAtRetirement * conservativeReturnRate;
    const safeWithdrawalDifference =
      desiredRetirementIncome > 0
        ? safeWithdrawalIncome - desiredRetirementIncome
        : null;
    const coversLongevity =
      yearsIntoRetirementAtRunOut === null ||
      yearsIntoRetirementAtRunOut >= targetRetirementYears;

    return {
      ...plan,
      yearsIntoRetirementAtRunOut,
      yearsIntoRetirementText,
      yearsIntoRetirementDescription,
      runOutAge,
      retirementStartAge,
      shortfallAtRetirement,
      safeWithdrawalIncome,
      safeWithdrawalDifference,
      coversLongevity,
    };
  };

  const buildRetirementPlainLanguage = (metrics, { planType, monthlyContribution, accumulationRate }) => {
    if (!metrics) return '';
    const insights = [];
    const rateText = formatPercent(accumulationRate);
    const targetAge =
      retirementAge > 0
        ? Math.round(retirementAge)
        : metrics.retirementStartAge ?? Math.round(baseAge + (metrics.retirementStartYear || 0));
    const monthlyDescriptor =
      monthlyContribution > 0
        ? `saving ${formatCurrency(monthlyContribution)} each month`
        : 'relying on your current balance';

    if (planType === 'recommended') {
      if (monthlyContribution > 0) {
        insights.push(
          `Following the recommended savings of ${formatCurrency(
            monthlyContribution,
          )} per month at about ${rateText} growth could build roughly ${formatCurrency(
            metrics.balanceAtRetirement,
          )} by age ${targetAge}.`,
        );
      } else {
        insights.push(
          `With the recommended allocation, your current balance could grow to about ${formatCurrency(
            metrics.balanceAtRetirement,
          )} by age ${targetAge} at about ${rateText} growth.`,
        );
      }
    } else {
      if (targetAge) {
        insights.push(
          `If you continue ${monthlyDescriptor} at about ${rateText} growth, you could have roughly ${formatCurrency(
            metrics.balanceAtRetirement,
          )} by age ${targetAge}.`,
        );
      } else {
        insights.push(
          `If you continue ${monthlyDescriptor} at about ${rateText} growth, you could build roughly ${formatCurrency(
            metrics.balanceAtRetirement,
          )} over time.`,
        );
      }
    }

    if (desiredRetirementIncome > 0 && metrics.safeWithdrawalDifference !== null) {
      const gapWord = metrics.safeWithdrawalDifference >= 0 ? 'surplus' : 'shortfall';
      insights.push(
        `Safe withdrawal of 4% with a conservative ${formatPercent(
          conservativeReturnRate,
        )} return would provide about ${formatCurrency(
          metrics.safeWithdrawalIncome,
        )} per year, leaving a ${gapWord} of ${formatCurrency(
          Math.abs(metrics.safeWithdrawalDifference),
        )} compared with your ${formatCurrency(desiredRetirementIncome)} goal.`,
      );
    } else if (metrics.safeWithdrawalIncome > 0) {
      insights.push(
        `Safe withdrawal of 4% with a conservative ${formatPercent(
          conservativeReturnRate,
        )} return would provide about ${formatCurrency(
          metrics.safeWithdrawalIncome,
        )} per year from that balance.`,
      );
    }

    if (metrics.inheritanceBalanceAt100 !== null) {
      if (metrics.inheritanceBalanceAt100 > 0) {
        insights.push(
          `${planType === 'recommended' ? 'Under this approach' : 'At the current pace'}, the balance is projected to hold about ${formatCurrency(
            metrics.inheritanceBalanceAt100,
          )} at age 100.`,
        );
      } else if (metrics.runOutAge && metrics.runOutAge <= ageTarget) {
        insights.push(
          `${planType === 'recommended' ? 'This approach' : 'We'} calculate that savings would run out around age ${Math.round(
            metrics.runOutAge,
          )}, leaving nothing by age 100.`,
        );
      } else {
        insights.push('We calculate that the balance would be fully used by age 100.');
      }
    }

    if (
      wantsInheritance &&
      desiredInheritanceAmount > 0 &&
      metrics.inheritanceBalanceAt100 !== null
    ) {
      const inheritanceDifference =
        metrics.inheritanceBalanceAt100 - desiredInheritanceAmount;
      const inheritanceWord = inheritanceDifference >= 0 ? 'surplus' : 'shortfall';
      insights.push(
        `Your inheritance goal of ${formatCurrency(
          desiredInheritanceAmount,
        )} would end with a ${inheritanceWord} of ${formatCurrency(
          Math.abs(inheritanceDifference),
        )} based on the age 100 projection.`,
      );
    }

    if (
      metrics.runOutAge &&
      metrics.runOutAge <= ageTarget &&
      metrics.yearsIntoRetirementDescription
    ) {
      insights.push(
        `${planType === 'recommended' ? 'Under this plan' : 'At the current pace'}, funds are estimated to run out about ${metrics.yearsIntoRetirementDescription} into retirement (age ${Math.round(
          metrics.runOutAge,
        )}).`,
      );
    }

    return `<div class="retirement-summary">${insights
      .map((sentence) => `<p>${sentence}</p>`)
      .join('')}</div>`;
  };

  const renderRetirementChart = (
    metrics,
    { lineClass, markerClass, legendLabel, legendSwatch },
  ) => {
    if (!metrics || !metrics.chartTrajectory.length) {
      return `<p class="projection-empty">Add retirement timing and income goals to see projected drawdown.</p>`;
    }

    const chartMax = Math.max(
      0,
      requiredNestEgg,
      ...metrics.chartTrajectory.map((point) => point.balance),
    );

    if (chartMax <= 0) {
      return `<p class="projection-empty">Add retirement timing and income goals to see projected drawdown.</p>`;
    }

    const chartWidth = 640;
    const chartHeight = 320;
    const padding = { top: 20, right: 32, bottom: 48, left: 72 };

    const xScale = (year) =>
      padding.left +
      (year / projectionHorizon) *
        (chartWidth - padding.left - padding.right);

    const yScale = (value) => {
      if (!chartMax) {
        return chartHeight - padding.bottom;
      }
      const usableHeight = chartHeight - padding.top - padding.bottom;
      return chartHeight - padding.bottom - (value / chartMax) * usableHeight;
    };

    const path = metrics.chartTrajectory
      .map((point, idx) => {
        const command = idx === 0 ? 'M' : 'L';
        return `${command}${xScale(point.year).toFixed(2)} ${yScale(point.balance).toFixed(2)}`;
      })
      .join('');

    const markerInterval = Math.max(1, Math.round(projectionHorizon / 6));
    const markers = metrics.chartTrajectory
      .filter(
        (point, index, arr) =>
          index === 0 ||
          index === arr.length - 1 ||
          point.year % markerInterval === 0,
      )
      .map((point) => {
        const x = xScale(point.year);
        const y = yScale(point.balance);
        return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3" />`;
      })
      .join('');

    const tickInterval = Math.max(1, Math.round(projectionHorizon / 5));
    const xTicks = [];
    for (let year = 0; year <= projectionHorizon; year += tickInterval) {
      xTicks.push(year);
    }
    if (xTicks[xTicks.length - 1] !== projectionHorizon) {
      xTicks.push(projectionHorizon);
    }

    const yTickCount = 4;
    const yTicks = Array.from({ length: yTickCount + 1 }, (_, index) => (chartMax / yTickCount) * index);

    const gridHorizontal = yTicks
      .map((tick) => {
        const y = yScale(tick);
        return `<line x1="${padding.left}" x2="${chartWidth - padding.right}" y1="${y.toFixed(2)}" y2="${y.toFixed(2)}" />`;
      })
      .join('');

    const gridVertical = xTicks
      .map((tick) => {
        const x = xScale(tick);
        return `<line y1="${padding.top}" y2="${chartHeight - padding.bottom}" x1="${x.toFixed(2)}" x2="${x.toFixed(2)}" />`;
      })
      .join('');

    const xLabels = xTicks
      .map((tick) => {
        const x = xScale(tick);
        const ageLabel = Math.round(baseAge + tick);
        return `<text x="${x.toFixed(2)}" y="${chartHeight - padding.bottom + 24}" text-anchor="middle">Age ${ageLabel}</text>`;
      })
      .join('');

    const yLabels = yTicks
      .map((tick) => {
        const y = yScale(tick);
        return `<text x="${padding.left - 12}" y="${(y + 6).toFixed(2)}" text-anchor="end">${formatCurrency(tick)}</text>`;
      })
      .join('');

    const events = (() => {
      const markers = [];
      if (metrics.retirementStartYear !== null) {
        const clampedYear = Math.min(metrics.retirementStartYear, projectionHorizon);
        const x = xScale(clampedYear);
        const retirementAgeLabel =
          metrics.retirementStartAge ?? Math.round(baseAge + clampedYear);
        markers.push(
          `<line class="projection-event-line" x1="${x.toFixed(2)}" x2="${x.toFixed(
            2,
          )}" y1="${padding.top}" y2="${chartHeight - padding.bottom}" />`,
        );
        markers.push(
          `<text class="projection-event-label" x="${x.toFixed(2)}" y="${chartHeight - padding.bottom + 20}" text-anchor="middle">Retirement (Age ${retirementAgeLabel})</text>`,
        );
      }
      if (metrics.runOutYear !== null) {
        const clampedYear = Math.min(metrics.runOutYear, projectionHorizon);
        const x = xScale(clampedYear);
        const ageLabel = metrics.runOutAge ?? Math.round(baseAge + metrics.runOutYear);
        const label =
          metrics.yearsIntoRetirementText !== null
            ? metrics.yearsIntoRetirementText === '< 1'
              ? 'Run out <1 yr in'
              : `Run out ${metrics.yearsIntoRetirementText} yr${
                  metrics.yearsIntoRetirementText === '1' ? '' : 's'
                } in`
            : 'Run out';
        markers.push(
          `<line class="projection-event-line projection-event-line--warning" x1="${x.toFixed(
            2,
          )}" x2="${x.toFixed(2)}" y1="${padding.top}" y2="${chartHeight - padding.bottom}" />`,
        );
        markers.push(
          `<text class="projection-event-label projection-event-label--warning" x="${x.toFixed(
            2,
          )}" y="${chartHeight - padding.bottom + 20}" text-anchor="middle">${label} (Age ${ageLabel})</text>`,
        );
      }
      return markers.join('');
    })();

    return `<div class="projection-graph">
        <svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="Retirement readiness projection">
          <g class="projection-grid">
            ${gridHorizontal}${gridVertical}
          </g>
          <line class="projection-axis" x1="${padding.left}" y1="${chartHeight - padding.bottom}" x2="${chartWidth - padding.right}" y2="${chartHeight - padding.bottom}" />
          <line class="projection-axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${chartHeight - padding.bottom}" />
          <path class="projection-line ${lineClass}" d="${path}" />
          <g class="projection-markers ${markerClass}">
            ${markers}
          </g>
          <g class="projection-events">
            ${events}
          </g>
          <g class="projection-labels projection-labels--x">
            ${xLabels}
          </g>
          <g class="projection-labels projection-labels--y">
            ${yLabels}
          </g>
        </svg>
        <div class="projection-legend">
          <span class="legend-item"><span class="legend-swatch ${legendSwatch}"></span>${legendLabel}</span>
        </div>
      </div>`;
  };

  const currentPlanMetrics = canProjectRetirement
    ? analyzeRetirementPlan(
        simulateRetirementPlan(monthlySavings, assumedReturnRate),
      )
    : null;

  const finalRetirementBalance = currentPlanMetrics?.finalBalance || 0;
  const balanceAtRetirement = currentPlanMetrics?.balanceAtRetirement || 0;

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
  if (wantsInheritance && desiredInheritanceAmount > 0) {
    retirementSummaryDetails.push(
      `Inheritance goal ${formatCurrency(desiredInheritanceAmount)} @ age 100`,
    );
  }
  const retirementSummaryLine = retirementSummaryDetails.length
    ? retirementSummaryDetails.join(' • ')
    : 'Retirement goal details pending';

  const retirementStatusTag = canProjectRetirement && currentPlanMetrics
    ? currentPlanMetrics.shortfallAtRetirement > 0
      ? `<div class="tag tag--alert">Shortfall at retirement: ${formatCurrency(
          currentPlanMetrics.shortfallAtRetirement,
        )}</div>`
      : currentPlanMetrics.coversLongevity
      ? `<div class="tag tag--success">On pace — withdrawals funded through age ${
          longevityAge ? Math.round(Math.min(longevityAge, ageTarget)) : ageTarget
        }</div>`
      : `<div class="tag tag--alert">Withdrawals exhaust savings around age ${
          currentPlanMetrics.runOutAge ??
          Math.round(
            (retirementAge || baseAge) +
              (currentPlanMetrics.yearsIntoRetirementAtRunOut || 0),
          )
        }</div>`
    : '';

  const retirementReadinessCopy = canProjectRetirement && currentPlanMetrics
    ? currentPlanMetrics.shortfallAtRetirement > 0
      ? `Current contributions are projected to build ${formatCurrency(
          currentPlanMetrics.balanceAtRetirement,
        )} by age ${retirementAge}, leaving ${formatCurrency(
          currentPlanMetrics.shortfallAtRetirement,
        )} less than the ${formatCurrency(
          requiredNestEgg,
        )} estimated to fund ${formatCurrency(desiredRetirementIncome)} per year.`
      : currentPlanMetrics.coversLongevity
      ? `Projected savings of ${formatCurrency(
          currentPlanMetrics.balanceAtRetirement,
        )} at age ${retirementAge} support ${formatCurrency(
          desiredRetirementIncome,
        )} annually through age ${
          longevityAge ? Math.round(Math.min(longevityAge, ageTarget)) : ageTarget
        }, leaving approximately ${formatCurrency(
          currentPlanMetrics.inheritanceBalanceAt100 ?? finalRetirementBalance,
        )} remaining.`
      : `Projected savings meet the income goal at retirement, but drawing ${formatCurrency(
          desiredRetirementIncome,
        )} annually is estimated to deplete savings around age ${
          currentPlanMetrics.runOutAge ??
          Math.round(
            (retirementAge || baseAge) +
              (currentPlanMetrics.yearsIntoRetirementAtRunOut || 0),
          )
        } (${currentPlanMetrics.yearsIntoRetirementDescription || '0 years'} into retirement). Increase savings or adjust withdrawals to extend coverage.`
    : yearsToRetirement !== null && yearsToRetirement <= 0
    ? 'Adjust the target retirement age to be greater than your current age to calculate readiness.'
    : 'Add your target retirement age and desired income to calculate readiness.';

  const retirementPlainLanguage = canProjectRetirement
    ? buildRetirementPlainLanguage(currentPlanMetrics, {
        planType: 'current',
        monthlyContribution: monthlySavings,
        accumulationRate: assumedReturnRate,
      })
    : '';

  const retirementChart = canProjectRetirement
    ? renderRetirementChart(currentPlanMetrics, {
        lineClass: 'projection-line--current',
        markerClass: 'projection-markers--current',
        legendLabel: `Account value (current contributions until retirement, then ${formatCurrency(
          desiredRetirementIncome,
        )}/yr withdrawals @ ${formatPercent(conservativeReturnRate)})`,
        legendSwatch: 'legend-swatch--current',
      })
    : `<p class="projection-empty">Add retirement timing and income goals to see projected drawdown.</p>`;

  const hasRecommendation =
    recommendedMonthlySavings > 0 && savingsGap > 1 && canProjectRetirement;
  const recommendedPlanMetrics =
    hasRecommendation && canProjectRetirement
      ? analyzeRetirementPlan(
          simulateRetirementPlan(
            recommendedMonthlySavings,
            recommendedReturnRate,
          ),
        )
      : null;

  const recommendedStatusTag =
    hasRecommendation && recommendedPlanMetrics
      ? recommendedPlanMetrics.shortfallAtRetirement > 0
        ? `<div class="tag tag--alert">Gap remaining: ${formatCurrency(
            recommendedPlanMetrics.shortfallAtRetirement,
          )}</div>`
        : recommendedPlanMetrics.coversLongevity
        ? `<div class="tag tag--success">Recommendation funds withdrawals through age ${
            longevityAge ? Math.round(Math.min(longevityAge, ageTarget)) : ageTarget
          }</div>`
        : `<div class="tag tag--alert">Recommendation still runs out around age ${
            recommendedPlanMetrics.runOutAge ??
            Math.round(
              (retirementAge || baseAge) +
                (recommendedPlanMetrics.yearsIntoRetirementAtRunOut || 0),
            )
          }</div>`
      : '';

  const recommendedReadinessCopy =
    hasRecommendation && recommendedPlanMetrics
      ? recommendedPlanMetrics.shortfallAtRetirement > 0
        ? `Saving ${formatCurrency(
            recommendedMonthlySavings,
          )} per month is projected to reach ${formatCurrency(
            recommendedPlanMetrics.balanceAtRetirement,
          )} by age ${retirementAge}, leaving a remaining gap of ${formatCurrency(
            recommendedPlanMetrics.shortfallAtRetirement,
          )} versus the ${formatCurrency(requiredNestEgg)} target.`
        : recommendedPlanMetrics.coversLongevity
        ? `Saving ${formatCurrency(
            recommendedMonthlySavings,
          )} per month is projected to deliver ${formatCurrency(
            recommendedPlanMetrics.balanceAtRetirement,
          )} at age ${retirementAge}, funding ${formatCurrency(
            desiredRetirementIncome,
          )} annually through age ${
            longevityAge ? Math.round(Math.min(longevityAge, ageTarget)) : ageTarget
          }.`
        : `Saving ${formatCurrency(
            recommendedMonthlySavings,
          )} per month reaches the retirement balance goal, but withdrawals are expected to deplete savings around age ${
            recommendedPlanMetrics.runOutAge ??
            Math.round(
              (retirementAge || baseAge) +
                (recommendedPlanMetrics.yearsIntoRetirementAtRunOut || 0),
            )
          }.`
      : '';

  const recommendedPlainLanguage =
    hasRecommendation && recommendedPlanMetrics
      ? buildRetirementPlainLanguage(recommendedPlanMetrics, {
          planType: 'recommended',
          monthlyContribution: recommendedMonthlySavings,
          accumulationRate: recommendedReturnRate,
        })
      : '';

  const recommendedChart =
    hasRecommendation && recommendedPlanMetrics
      ? renderRetirementChart(recommendedPlanMetrics, {
          lineClass: 'projection-line--recommended',
          markerClass: 'projection-markers--recommended',
          legendLabel: `Account value (recommended contributions until retirement, then ${formatCurrency(
            desiredRetirementIncome,
          )}/yr withdrawals @ ${formatPercent(conservativeReturnRate)})`,
          legendSwatch: 'legend-swatch--recommended',
        })
      : '';

  const recommendedCardMessage = hasRecommendation && recommendedPlanMetrics
    ? ''
    : 'No recommendations at this time.';
  const recommendedSummaryLine = hasRecommendation && recommendedPlanMetrics
    ? `Recommended savings ${formatCurrency(
        recommendedMonthlySavings,
      )}/mo • Projected balance ${formatCurrency(
        recommendedPlanMetrics.balanceAtRetirement,
      )}`
    : 'No recommendations at this time.';
  const recommendedCardBody = hasRecommendation && recommendedPlanMetrics
    ? `${recommendedStatusTag}
          <p>${recommendedReadinessCopy}</p>
          ${recommendedPlainLanguage}
          ${recommendedChart}`
    : `<p>${recommendedCardMessage}</p>`;

  const recommendationCopy =
    hasRecommendation
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
    wantsInheritance && desiredInheritanceAmount > 0
      ? `Inheritance goal: ${formatCurrency(desiredInheritanceAmount)} at age 100`
      : null,
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
      <article class="card card--collapsible">
        <div class="card__header">
          <h3>Savings outlook</h3>
          <button
            type="button"
            class="card__toggle"
            data-section-label="savings outlook"
            aria-expanded="true"
          >
            <span class="sr-only">Collapse savings outlook details</span>
            <span aria-hidden="true" class="card__toggle-icon"></span>
          </button>
        </div>
        <div class="card__content">
          <p>
            Current investment mix: <strong>${escapeHTML(
              investmentLabel(investmentPreference),
            )}</strong>
          </p>
          <p>${recommendationCopy}</p>
          <p>${projectionComparison}</p>
          ${projectionChart}
        </div>
      </article>
      <article class="card card--collapsible">
        <div class="card__header">
          <h3>Retirement readiness - current plan</h3>
          <button
            type="button"
            class="card__toggle"
            data-section-label="retirement readiness - current plan"
            aria-expanded="true"
          >
            <span class="sr-only">Collapse current plan details</span>
            <span aria-hidden="true" class="card__toggle-icon"></span>
          </button>
        </div>
        <div class="card__content">
          <p>${retirementSummaryLine}</p>
          ${retirementStatusTag}
          <p>${retirementReadinessCopy}</p>
          ${retirementPlainLanguage}
          ${retirementChart}
        </div>
      </article>
      <article class="card card--collapsible${
        hasRecommendation && recommendedPlanMetrics ? '' : ' is-collapsed'
      }">
        <div class="card__header">
          <h3>Retirement readiness - recommended plan</h3>
          <button
            type="button"
            class="card__toggle"
            data-section-label="retirement readiness - recommended plan"
            aria-expanded="${
              hasRecommendation && recommendedPlanMetrics ? 'true' : 'false'
            }"
          >
            <span class="sr-only">${
              hasRecommendation && recommendedPlanMetrics
                ? 'Collapse recommended plan details'
                : 'Expand recommended plan details'
            }</span>
            <span aria-hidden="true" class="card__toggle-icon"></span>
          </button>
        </div>
        <div class="card__content">
          <p>${recommendedSummaryLine}</p>
          ${recommendedCardBody}
        </div>
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

      <article class="card card--collapsible">
        <div class="card__header">
          <h3>Goal tracker</h3>
          <button
            type="button"
            class="card__toggle"
            data-section-label="goal tracker"
            aria-expanded="true"
          >
            <span class="sr-only">Collapse goal tracker details</span>
            <span aria-hidden="true" class="card__toggle-icon"></span>
          </button>
        </div>
        <div class="card__content">
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
        </div>
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

      <article class="card card--collapsible">
        <div class="card__header">
          <h3>Immediate next steps</h3>
          <button
            type="button"
            class="card__toggle"
            data-section-label="immediate next steps"
            aria-expanded="true"
          >
            <span class="sr-only">Collapse immediate next steps details</span>
            <span aria-hidden="true" class="card__toggle-icon"></span>
          </button>
        </div>
        <div class="card__content">
          <ol>
            ${recommendations.map((item) => `<li>${item}</li>`).join('')}
          </ol>
          <p>
            Revisit this plan quarterly to capture life changes and update projections. Sharing this summary with your advisor will ensure ongoing accountability.
          </p>
        </div>
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
