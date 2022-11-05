import { assert, expect, test } from 'vitest'
import Converter from './convert';

test('Convert Commands', () => {
    const convert = new Converter("/a", "/b");
    const command = convert.getDiffuserToCkptCommand();
    expect(command.executable).toEqual("python");
    expect(command.arguments).toEqual([
        convert.diffuserToOriginScript,
        "--model_path=/a",
        "--checkpoint_path=/b/model.ckpt",
    ]);
    expect(command.environment).toBeUndefined();
});