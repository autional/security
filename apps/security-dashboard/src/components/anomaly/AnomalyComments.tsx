'use client';

import React, { useState } from 'react';
import { List, Input, Button, Avatar, Empty } from 'antd';
import { Send, User } from 'lucide-react';
import dayjs from 'dayjs';
import { addAnomalyComment } from '@/lib/api.generated';
import { message } from '@/lib/antd-app';
import { Can } from '@/components/Can';
import { useTranslation } from 'react-i18next';
import type { AnomalyCommentResponse } from '@autional/shared/generated/types';

interface AnomalyCommentsProps {
	anomalyId: string;
	initialComments: AnomalyCommentResponse[];
	onRefresh: (id: string) => void;
}

export default function AnomalyComments({
	anomalyId,
	initialComments,
	onRefresh,
}: AnomalyCommentsProps) {
	const { t } = useTranslation();
	const [comments, setComments] = useState<AnomalyCommentResponse[]>(initialComments);
	const [newComment, setNewComment] = useState('');
	const [submitting, setSubmitting] = useState(false);

	React.useEffect(() => {
		setComments(initialComments);
	}, [initialComments]);

	const handleSubmit = async () => {
		if (!newComment.trim()) {
			message.warning(t('anomalies.commentWarning'));
			return;
		}
		setSubmitting(true);
		try {
			await addAnomalyComment(anomalyId, { content: newComment.trim() });
			message.success(t('anomalies.commentAdded'));
			setNewComment('');
			onRefresh(anomalyId);
		} catch {
			message.error(t('anomalies.addCommentFailed'));
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex gap-2">
				<Input.TextArea
					placeholder={t('anomalies.commentPlaceholder')}
					value={newComment}
					onChange={(e) => setNewComment(e.target.value)}
					rows={2}
					maxLength={500}
					showCount
				/>
				<Can denyAuditor>
					<Button
						type="primary"
						icon={<Send size="1em" />}
						loading={submitting}
						onClick={handleSubmit}
						className="self-end"
					>
						{t('anomalies.commentSend')}
					</Button>
				</Can>
			</div>

			{comments.length === 0 ? (
				<Empty description={t('anomalies.noComments')} />
			) : (
				<List
					dataSource={comments}
					renderItem={(item) => (
						<List.Item>
							<List.Item.Meta
								avatar={
									<Avatar
										icon={<User size="1em" />}
										style={{ backgroundColor: 'var(--color-brand)' }}
									/>
								}
								title={
									<div className="flex items-center justify-between">
										<span className="text-sm font-medium">
											{item.authorName || item.authorId || t('app.user')}
										</span>
										<span className="text-xs text-neutral-600">
											{item.createdAt ? dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
										</span>
									</div>
								}
								description={<div className="text-sm text-neutral-800 mt-1">{item.content}</div>}
							/>
						</List.Item>
					)}
				/>
			)}
		</div>
	);
}
