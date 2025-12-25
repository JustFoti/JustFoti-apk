/**
 * Property-Based Tests for Bot Detection Manual Review Workflow
 * Feature: admin-panel-unified-refactor, Property 30: Manual review workflow
 * Validates: Requirements 10.5
 */

import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';

// Bot detection types
interface BotDetection {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  confidenceScore: number; // 0-100
  detectionReasons: string[];
  status: 'suspected' | 'confirmed_bot' | 'confirmed_human' | 'pending_review';
  reviewedBy?: string;
  reviewedAt?: number;
  createdAt: number;
  updatedAt: number;
}

interface ManualReview {
  detectionId: string;
  reviewerId: string;
  decision: 'confirm_bot' | 'confirm_human' | 'needs_more_data';
  confidence: number; // 0-100, reviewer's confidence in their decision
  notes?: string;
  reviewedAt: number;
}

interface ReviewFeedback {
  originalDetection: BotDetection;
  manualReview: ManualReview;
  accuracyImprovement: number; // How much this review should improve future detection
}

interface DetectionSystem {
  detections: Map<string, BotDetection>;
  reviews: Map<string, ManualReview>;
  accuracyMetrics: {
    totalReviews: number;
    correctDetections: number;
    falsePositives: number;
    falseNegatives: number;
    overallAccuracy: number;
  };
}

// Manual review workflow system
class BotDetectionReviewSystem {
  private detections = new Map<string, BotDetection>();
  private reviews = new Map<string, ManualReview>();
  private accuracyMetrics = {
    totalReviews: 0,
    correctDetections: 0,
    falsePositives: 0,
    falseNegatives: 0,
    overallAccuracy: 0,
  };

  addDetection(detection: BotDetection): void {
    this.detections.set(detection.id, detection);
  }

  submitManualReview(review: ManualReview): ReviewFeedback {
    const detection = this.detections.get(review.detectionId);
    if (!detection) {
      throw new Error('Detection not found');
    }

    // Update detection status based on review
    const updatedDetection: BotDetection = {
      ...detection,
      status: review.decision === 'confirm_bot' ? 'confirmed_bot' : 
              review.decision === 'confirm_human' ? 'confirmed_human' : 
              'pending_review',
      reviewedBy: review.reviewerId,
      reviewedAt: review.reviewedAt,
      updatedAt: review.reviewedAt,
    };

    this.detections.set(detection.id, updatedDetection);
    this.reviews.set(review.detectionId, review);

    // Calculate accuracy improvement
    const accuracyImprovement = this.calculateAccuracyImprovement(detection, review);
    
    // Update accuracy metrics
    this.updateAccuracyMetrics(detection, review);

    return {
      originalDetection: detection,
      manualReview: review,
      accuracyImprovement,
    };
  }

  private calculateAccuracyImprovement(detection: BotDetection, review: ManualReview): number {
    // Calculate how much this review should improve future detection accuracy
    const confidenceDifference = Math.abs(detection.confidenceScore - review.confidence);
    const reviewerConfidence = review.confidence / 100;
    
    // Higher improvement for cases where:
    // 1. Reviewer is very confident
    // 2. There's a significant difference between detection and review
    // 3. The detection was in the uncertain range (30-70)
    
    let improvement = reviewerConfidence * 0.3; // Base improvement from reviewer confidence
    
    if (confidenceDifference > 30) {
      improvement += 0.4; // Significant disagreement provides more learning
    }
    
    if (detection.confidenceScore >= 30 && detection.confidenceScore <= 70) {
      improvement += 0.3; // Uncertain cases provide more learning value
    }
    
    return Math.min(1.0, improvement);
  }

  private updateAccuracyMetrics(detection: BotDetection, review: ManualReview): void {
    this.accuracyMetrics.totalReviews++;

    // Determine if the original detection was correct
    const wasCorrectDetection = 
      (detection.status === 'confirmed_bot' && review.decision === 'confirm_bot') ||
      (detection.status === 'confirmed_human' && review.decision === 'confirm_human') ||
      (detection.status === 'suspected' && review.decision === 'confirm_bot') ||
      (detection.status === 'pending_review' && review.decision !== 'needs_more_data');

    if (wasCorrectDetection) {
      this.accuracyMetrics.correctDetections++;
    } else {
      // Classify the type of error
      if (detection.confidenceScore >= 50 && review.decision === 'confirm_human') {
        this.accuracyMetrics.falsePositives++;
      } else if (detection.confidenceScore < 50 && review.decision === 'confirm_bot') {
        this.accuracyMetrics.falseNegatives++;
      }
    }

    // Update overall accuracy
    this.accuracyMetrics.overallAccuracy = 
      this.accuracyMetrics.correctDetections / this.accuracyMetrics.totalReviews;
  }

  getDetection(id: string): BotDetection | undefined {
    return this.detections.get(id);
  }

  getReview(detectionId: string): ManualReview | undefined {
    return this.reviews.get(detectionId);
  }

  getAccuracyMetrics() {
    return { ...this.accuracyMetrics };
  }

  getPendingReviews(): BotDetection[] {
    return Array.from(this.detections.values()).filter(
      detection => detection.status === 'pending_review' && !detection.reviewedBy
    );
  }

  getReviewHistory(): Array<{ detection: BotDetection; review: ManualReview }> {
    const history: Array<{ detection: BotDetection; review: ManualReview }> = [];
    
    for (const [detectionId, review] of this.reviews.entries()) {
      const detection = this.detections.get(detectionId);
      if (detection) {
        history.push({ detection, review });
      }
    }
    
    return history.sort((a, b) => b.review.reviewedAt - a.review.reviewedAt);
  }
}

describe('Bot Detection Manual Review Workflow', () => {
  test('Property 30: Manual review workflow', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate bot detections and manual reviews
        fc.array(
          fc.record({
            id: fc.string({ minLength: 5, maxLength: 20 }),
            userId: fc.string({ minLength: 5, maxLength: 20 }),
            ipAddress: fc.ipV4(),
            userAgent: fc.string({ minLength: 10, maxLength: 100 }),
            confidenceScore: fc.integer({ min: 0, max: 100 }),
            detectionReasons: fc.array(fc.string({ minLength: 10, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
            status: fc.constantFrom('suspected', 'confirmed_bot', 'confirmed_human', 'pending_review'),
            createdAt: fc.integer({ min: 1000000000000, max: Date.now() }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.array(
          fc.record({
            reviewerId: fc.string({ minLength: 5, maxLength: 20 }),
            decision: fc.constantFrom('confirm_bot', 'confirm_human', 'needs_more_data'),
            confidence: fc.integer({ min: 50, max: 100 }), // Reviewers should be reasonably confident
            notes: fc.option(fc.string({ minLength: 10, maxLength: 200 })),
            reviewedAt: fc.integer({ min: 1000000000000, max: Date.now() }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (detections, reviewInputs) => {
          const system = new BotDetectionReviewSystem();

          // Add detections to system
          const processedDetections = detections.map(detection => ({
            ...detection,
            updatedAt: detection.createdAt,
          }));

          for (const detection of processedDetections) {
            system.addDetection(detection);
          }

          // Process manual reviews
          const reviews: ManualReview[] = [];
          for (let i = 0; i < Math.min(reviewInputs.length, detections.length); i++) {
            const review: ManualReview = {
              detectionId: detections[i].id,
              ...reviewInputs[i],
            };
            reviews.push(review);
          }

          // Property: For any manually reviewed bot detection case, the system 
          // should update the classification and use the feedback to improve 
          // future detection accuracy

          for (const review of reviews) {
            const originalDetection = system.getDetection(review.detectionId);
            expect(originalDetection).toBeDefined();

            const feedback = system.submitManualReview(review);

            // 1. The detection should be updated with review information
            const updatedDetection = system.getDetection(review.detectionId);
            expect(updatedDetection).toBeDefined();
            expect(updatedDetection!.reviewedBy).toBe(review.reviewerId);
            expect(updatedDetection!.reviewedAt).toBe(review.reviewedAt);
            expect(updatedDetection!.updatedAt).toBe(review.reviewedAt);

            // 2. Status should be updated based on review decision
            if (review.decision === 'confirm_bot') {
              expect(updatedDetection!.status).toBe('confirmed_bot');
            } else if (review.decision === 'confirm_human') {
              expect(updatedDetection!.status).toBe('confirmed_human');
            } else if (review.decision === 'needs_more_data') {
              expect(updatedDetection!.status).toBe('pending_review');
            }

            // 3. Review should be stored and retrievable
            const storedReview = system.getReview(review.detectionId);
            expect(storedReview).toBeDefined();
            expect(storedReview!.reviewerId).toBe(review.reviewerId);
            expect(storedReview!.decision).toBe(review.decision);
            expect(storedReview!.confidence).toBe(review.confidence);

            // 4. Feedback should include accuracy improvement calculation
            expect(feedback.accuracyImprovement).toBeGreaterThanOrEqual(0);
            expect(feedback.accuracyImprovement).toBeLessThanOrEqual(1);
            expect(feedback.originalDetection).toEqual(originalDetection);
            expect(feedback.manualReview).toEqual(review);

            // 5. High-confidence reviews should provide more improvement
            if (review.confidence >= 90) {
              expect(feedback.accuracyImprovement).toBeGreaterThan(0.2);
            }
          }

          // 6. Accuracy metrics should be updated
          const metrics = system.getAccuracyMetrics();
          expect(metrics.totalReviews).toBe(reviews.length);
          expect(metrics.overallAccuracy).toBeGreaterThanOrEqual(0);
          expect(metrics.overallAccuracy).toBeLessThanOrEqual(1);

          // 7. Review history should be maintained
          const history = system.getReviewHistory();
          expect(history.length).toBe(reviews.length);
          
          // History should be sorted by review time (most recent first)
          for (let i = 1; i < history.length; i++) {
            expect(history[i-1].review.reviewedAt).toBeGreaterThanOrEqual(
              history[i].review.reviewedAt
            );
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Manual review workflow handles edge cases correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 5, maxLength: 20 }),
          userId: fc.string({ minLength: 5, maxLength: 20 }),
          ipAddress: fc.ipV4(),
          userAgent: fc.string({ minLength: 10, maxLength: 100 }),
          confidenceScore: fc.integer({ min: 30, max: 70 }), // Uncertain range
          detectionReasons: fc.array(fc.string({ minLength: 10, maxLength: 50 }), { minLength: 1, maxLength: 3 }),
          status: fc.constantFrom('suspected', 'pending_review'),
          createdAt: fc.integer({ min: 1000000000000, max: Date.now() }),
        }),
        fc.record({
          reviewerId: fc.string({ minLength: 5, maxLength: 20 }),
          decision: fc.constantFrom('confirm_bot', 'confirm_human'),
          confidence: fc.integer({ min: 80, max: 100 }), // High confidence reviewer
          notes: fc.option(fc.string({ minLength: 20, maxLength: 200 })),
          reviewedAt: fc.integer({ min: 1000000000000, max: Date.now() }),
        }),
        async (detection, reviewInput) => {
          const system = new BotDetectionReviewSystem();
          
          const processedDetection = {
            ...detection,
            updatedAt: detection.createdAt,
          };

          system.addDetection(processedDetection);

          const review: ManualReview = {
            detectionId: detection.id,
            ...reviewInput,
          };

          const feedback = system.submitManualReview(review);

          // Property: Uncertain detections reviewed with high confidence 
          // should provide significant accuracy improvement
          expect(feedback.accuracyImprovement).toBeGreaterThan(0.5);

          // The system should learn more from cases where there's disagreement
          const confidenceDifference = Math.abs(detection.confidenceScore - review.confidence);
          if (confidenceDifference > 30) {
            expect(feedback.accuracyImprovement).toBeGreaterThan(0.6);
          }

          // Updated detection should reflect the review
          const updatedDetection = system.getDetection(detection.id);
          expect(updatedDetection!.status).toBe(
            review.decision === 'confirm_bot' ? 'confirmed_bot' : 'confirmed_human'
          );

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Review workflow maintains data integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 5, maxLength: 20 }),
            userId: fc.string({ minLength: 5, maxLength: 20 }),
            ipAddress: fc.ipV4(),
            userAgent: fc.string({ minLength: 10, maxLength: 100 }),
            confidenceScore: fc.integer({ min: 0, max: 100 }),
            detectionReasons: fc.array(fc.string({ minLength: 10, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
            status: fc.constantFrom('suspected', 'pending_review'),
            createdAt: fc.integer({ min: 1000000000000, max: Date.now() }),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (detections) => {
          const system = new BotDetectionReviewSystem();

          // Add detections
          for (const detection of detections) {
            system.addDetection({
              ...detection,
              updatedAt: detection.createdAt,
            });
          }

          // Create reviews for all detections
          const reviews: ManualReview[] = detections.map((detection, index) => ({
            detectionId: detection.id,
            reviewerId: `reviewer_${index}`,
            decision: index % 2 === 0 ? 'confirm_bot' : 'confirm_human',
            confidence: 85 + (index % 15), // 85-99
            reviewedAt: Date.now() + index * 1000,
          }));

          // Process all reviews
          for (const review of reviews) {
            system.submitManualReview(review);
          }

          // Property: Data integrity should be maintained throughout the workflow
          
          // 1. All detections should still exist
          for (const detection of detections) {
            const stored = system.getDetection(detection.id);
            expect(stored).toBeDefined();
            expect(stored!.id).toBe(detection.id);
            expect(stored!.userId).toBe(detection.userId);
          }

          // 2. All reviews should be stored
          for (const review of reviews) {
            const stored = system.getReview(review.detectionId);
            expect(stored).toBeDefined();
            expect(stored!.reviewerId).toBe(review.reviewerId);
            expect(stored!.decision).toBe(review.decision);
          }

          // 3. Accuracy metrics should be consistent
          const metrics = system.getAccuracyMetrics();
          expect(metrics.totalReviews).toBe(reviews.length);
          expect(metrics.correctDetections + metrics.falsePositives + metrics.falseNegatives)
            .toBeLessThanOrEqual(metrics.totalReviews);

          // 4. No pending reviews should remain (all were processed)
          const pendingReviews = system.getPendingReviews();
          expect(pendingReviews.length).toBe(0);

          // 5. Review history should contain all reviews
          const history = system.getReviewHistory();
          expect(history.length).toBe(reviews.length);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Invalid review operations are handled correctly', async () => {
    const system = new BotDetectionReviewSystem();

    // Property: System should handle invalid review operations gracefully
    
    // Attempting to review non-existent detection should throw error
    const invalidReview: ManualReview = {
      detectionId: 'non-existent-id',
      reviewerId: 'reviewer1',
      decision: 'confirm_bot',
      confidence: 90,
      reviewedAt: Date.now(),
    };

    expect(() => {
      system.submitManualReview(invalidReview);
    }).toThrow('Detection not found');

    // Metrics should remain at zero
    const metrics = system.getAccuracyMetrics();
    expect(metrics.totalReviews).toBe(0);
    expect(metrics.correctDetections).toBe(0);
  });
});