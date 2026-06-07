import { Injectable } from '@angular/core';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { ADDON_MOD_CHALLENGELEARNING_COMPONENT_LEGACY } from '../constants';

@Injectable({ providedIn: 'root' })
export class AddonModChallengeLearningProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmaModChallengeLearning:';

    /**
     * Return whether the plugin is enabled in a site.
     */
    async isPluginEnabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return site.wsAvailable('mod_challengelearning_start_session') &&
            site.wsAvailable('mod_challengelearning_get_overview');
    }

    /**
     * Get unified SmartScore, level info and session history for the current user.
     */
    async getOverview(instanceid: number, siteId?: string): Promise<AddonModChallengeLearningOverview> {
        const site = await CoreSites.getSite(siteId);

        return site.read<AddonModChallengeLearningOverview>(
            'mod_challengelearning_get_overview',
            { instanceid },
            {
                cacheKey: this.getOverviewCacheKey(instanceid),
                component: ADDON_MOD_CHALLENGELEARNING_COMPONENT_LEGACY,
            },
        );
    }

    /**
     * Start a new challenge session.
     */
    async startSession(instanceid: number, siteId?: string): Promise<AddonModChallengeLearningStartResult> {
        const site = await CoreSites.getSite(siteId);

        return site.write<AddonModChallengeLearningStartResult>(
            'mod_challengelearning_start_session',
            { instanceid },
        );
    }

    /**
     * Submit an answer for the current question.
     */
    async submitAnswer(
        sessionid: number,
        questionid: number,
        answerid: number,
        time_taken = 0,
        siteId?: string,
    ): Promise<AddonModChallengeLearningSubmitResult> {
        const site = await CoreSites.getSite(siteId);

        return site.write<AddonModChallengeLearningSubmitResult>(
            'mod_challengelearning_submit_answer',
            { sessionid, questionid, answerid, time_taken },
        );
    }

    /**
     * Get the class leaderboard.
     */
    async getLeaderboard(instanceid: number, siteId?: string): Promise<AddonModChallengeLearningLeaderboardEntry[]> {
        const site = await CoreSites.getSite(siteId);

        return site.read<AddonModChallengeLearningLeaderboardEntry[]>(
            'mod_challengelearning_get_leaderboard',
            { instanceid },
            { cacheKey: this.getLeaderboardCacheKey(instanceid) },
        );
    }

    /**
     * Invalidate cached content for the activity.
     */
    async invalidateContent(moduleId: number, courseId: number, instanceid?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const promises: Promise<void>[] = [];

        if (instanceid) {
            promises.push(site.invalidateWsCacheForKey(this.getOverviewCacheKey(instanceid)));
            promises.push(site.invalidateWsCacheForKey(this.getLeaderboardCacheKey(instanceid)));
        }

        await Promise.all(promises);
    }

    protected getOverviewCacheKey(instanceid: number): string {
        return `${AddonModChallengeLearningProvider.ROOT_CACHE_KEY}overview:${instanceid}`;
    }

    protected getLeaderboardCacheKey(instanceid: number): string {
        return `${AddonModChallengeLearningProvider.ROOT_CACHE_KEY}leaderboard:${instanceid}`;
    }
}

export const AddonModChallengeLearning = makeSingleton(AddonModChallengeLearningProvider);

// ── Types ──────────────────────────────────────────────────────────────────

export type AddonModChallengeLearningOverview = {
    smartscore: number;
    attempts_total: number;
    streak_best: number;
    level: number;
    level_name: string;
    level_icon: string;
    level_color: string;
    sessions: AddonModChallengeLearningSessionSummary[];
};

export type AddonModChallengeLearningSessionSummary = {
    num: number;
    timecompleted: number;
    questions_correct: number;
    questions_total: number;
    score_end: number;
    delta: number;
};

export type AddonModChallengeLearningQuestion = {
    id: number;
    text: string;
    answers: AddonModChallengeLearningAnswer[];
    difficulty_level: number;
    difficulty_label: string;
    skillid: number;
    question_number: number;
    total_questions: number;
};

export type AddonModChallengeLearningAnswer = {
    id: number;
    text: string;
};

export type AddonModChallengeLearningStartResult = {
    sessionid: number;
    total_questions: number;
    question?: AddonModChallengeLearningQuestion;
};

export type AddonModChallengeLearningSubmitResult = {
    is_correct: number;
    correct_answer_id: number;
    correct_answer: string;
    general_feedback: string;
    score_before: number;
    score_after: number;
    score_delta: number;
    new_streak: number;
    is_last: number;
    session_correct: number;
    session_total: number;
    level_now: number;
    achievements: AddonModChallengeLearningAchievement[];
    next_question?: AddonModChallengeLearningQuestion;
};

export type AddonModChallengeLearningAchievement = {
    key: string;
    icon: string;
    label: string;
};

export type AddonModChallengeLearningLeaderboardEntry = {
    rank: number;
    userid: number;
    fullname: string;
    smartscore: number;
    streak_best: number;
    is_me: boolean;
};
